import { prisma } from "@/lib/prisma";
import type { LivePosition, Mt5AccountInfo } from "@/app/[locale]/journal/journal-live-panel";
import type { ClosedTrade } from "@/components/mt5/history-table";
import { parseMql5Time } from "@/lib/mt5/parse-mql5-time";

export type LivePendingOrder = {
  ticket: string;
  symbol: string;
  type: string;
  volume: number | null;
  priceOpen: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  openedAt: string | null;
};

export type Mt5AccountResponse = {
  account: Mt5AccountInfo;
  positions: LivePosition[];
  orders: LivePendingOrder[];
  history: ClosedTrade[];
};

const HISTORY_LIMIT = 100;

export async function getMt5AccountSnapshot(userId: string): Promise<Mt5AccountResponse | null> {
  const connection = await prisma.mt5Connection.findFirst({
    where: { userId, revokedAt: null },
    orderBy: { lastSeenAt: "desc" },
    select: {
      id: true,
      balance: true,
      equity: true,
      margin: true,
      freeMargin: true,
      accountCurrency: true,
      openPositions: true,
      lastSeenAt: true,
      lastPositions: true,
      lastOrders: true,
      autoCloseBeforeWeekend: true,
      autoCloseEndOfDay: true,
      closeAllAtBreakeven: true,
      scheduledCloseEnabled: true,
      scheduledCloseTime: true,
      scheduledCloseTz: true,
      user: { select: { copyTradingPaused: true } },
    },
  });

  if (!connection) return null;

  const closedJournalEntries = await prisma.tradeJournal.findMany({
    where: {
      userId,
      closedAt: { not: null },
      mt5Link: { connectionId: connection.id },
    },
    orderBy: { closedAt: "desc" },
    take: HISTORY_LIMIT,
    select: {
      id: true,
      symbol: true,
      direction: true,
      entry: true,
      stopLoss: true,
      takeProfit: true,
      exitPrice: true,
      lotSize: true,
      result: true,
      pnl: true,
      openedAt: true,
      closedAt: true,
    },
  });

  const history: ClosedTrade[] = closedJournalEntries.map((j) => ({
    id: j.id,
    symbol: j.symbol,
    direction: j.direction,
    entry: j.entry,
    stopLoss: j.stopLoss,
    takeProfit: j.takeProfit,
    exitPrice: j.exitPrice,
    lotSize: j.lotSize,
    result: j.result,
    pnl: j.pnl,
    openedAt: j.openedAt.toISOString(),
    closedAt: j.closedAt!.toISOString(),
  }));

  const trailingConfigs = await prisma.trailingStopConfig.findMany({
    where: { connectionId: connection.id },
    select: { ticket: true, distancePips: true },
  });
  const trailingMap = new Map(trailingConfigs.map((c) => [c.ticket, c.distancePips]));

  const positions: LivePosition[] = [];
  if (Array.isArray(connection.lastPositions)) {
    for (const p of connection.lastPositions as Record<string, unknown>[]) {
      const ticket = p.ticket != null ? String(p.ticket) : null;
      const symbol = typeof p.symbol === "string" ? p.symbol : null;
      const type = typeof p.type === "string" ? p.type : null;
      if (!ticket || !symbol || !type) continue;
      const num = (v: unknown) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };
      positions.push({
        ticket,
        symbol,
        type,
        volume: num(p.volume),
        priceOpen: num(p.priceOpen),
        priceCurrent: num(p.priceCurrent),
        stopLoss: num(p.stopLoss),
        takeProfit: num(p.takeProfit),
        profit: num(p.profit),
        swap: num(p.swap),
        openedAt: parseMql5Time(p.openedAt),
        trailingPips: trailingMap.get(ticket) ?? null,
      });
    }
  }

  const orders: LivePendingOrder[] = [];
  if (Array.isArray(connection.lastOrders)) {
    for (const o of connection.lastOrders as Record<string, unknown>[]) {
      const ticket = o.ticket != null ? String(o.ticket) : null;
      const symbol = typeof o.symbol === "string" ? o.symbol : null;
      const type = typeof o.type === "string" ? o.type : null;
      if (!ticket || !symbol || !type) continue;
      const num = (v: unknown) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };
      orders.push({
        ticket,
        symbol,
        type,
        volume: num(o.volume),
        priceOpen: num(o.priceOpen),
        stopLoss: num(o.stopLoss),
        takeProfit: num(o.takeProfit),
        openedAt: typeof o.openedAt === "string" ? o.openedAt : null,
      });
    }
  }

  return {
    account: {
      balance: connection.balance,
      equity: connection.equity,
      margin: connection.margin,
      freeMargin: connection.freeMargin,
      currency: connection.accountCurrency,
      openPositions: connection.openPositions,
      lastSeenAt: connection.lastSeenAt?.toISOString() ?? null,
      autoCloseBeforeWeekend: connection.autoCloseBeforeWeekend,
      autoCloseEndOfDay: connection.autoCloseEndOfDay,
      closeAllAtBreakeven: connection.closeAllAtBreakeven,
      scheduledCloseEnabled: connection.scheduledCloseEnabled,
      scheduledCloseTime: connection.scheduledCloseTime,
      scheduledCloseTz: connection.scheduledCloseTz === "vn" ? "vn" : "utc",
      copyTradingPaused: connection.user.copyTradingPaused,
    },
    positions,
    orders,
    history,
  };
}
