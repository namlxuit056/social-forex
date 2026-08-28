import type { Prisma } from "@/generated/prisma/client";
import type { notifyTelegramClosedSignal } from "@/lib/telegram";
import type { ClosedDealInfo } from "@/lib/mt5/schemas";

function closeNoteForMt5(kind: "cancelled" | "closed", ticket: string, profit?: number | null) {
  if (kind === "cancelled") {
    return `Synced from MT5 pending order. Ticket: ${ticket}. Order is no longer pending in MT5.`;
  }

  const profitText = typeof profit === "number" ? ` Last seen profit: ${profit}.` : "";
  return `Synced from MT5 open position. Ticket: ${ticket}. Position is no longer open in MT5.${profitText}`;
}

type ClosedMt5Signal = Parameters<typeof notifyTelegramClosedSignal>[0];

// Shared by the live bridge heartbeat (POST /api/mt5/bridge) and the daily reconciliation
// cron: given the set of tickets MT5 currently reports as pending/open, close any linked
// Signal (and its TradeJournal) whose ticket has disappeared — MT5 doesn't tell us *why* a
// position is gone, only that it no longer exists, so "gone from the live/last-known list"
// is the only close signal we get.
export async function closeStaleSignalLinks(
  tx: Prisma.TransactionClient,
  connectionId: string,
  params: {
    activeMt5Tickets: Set<string>;
    pendingMt5Tickets: Set<string>;
    closedDealsByPosition: Map<string, ClosedDealInfo>;
    now: Date;
  },
): Promise<{ closedSignalIds: string[]; closedMt5Signals: ClosedMt5Signal[] }> {
  const { activeMt5Tickets, pendingMt5Tickets, closedDealsByPosition, now } = params;

  const liveLinks = await tx.mt5SignalLink.findMany({
    where: {
      connectionId,
      signal: { status: { in: ["PENDING", "ACTIVE"] } },
    },
    select: {
      id: true,
      mt5Ticket: true,
      kind: true,
      lastProfit: true,
      maeProfit: true,
      mfeProfit: true,
      signalId: true,
      journalId: true,
      signal: { select: { status: true, symbol: true, direction: true } },
    },
  });

  const closedSignalIds: string[] = [];
  const closedMt5Signals: ClosedMt5Signal[] = [];

  for (const link of liveLinks) {
    if (link.kind === "PENDING_ORDER" && link.signal.status === "PENDING" && !pendingMt5Tickets.has(link.mt5Ticket)) {
      const signal = await tx.signal.update({
        where: { id: link.signalId },
        data: {
          status: "CANCELLED",
          closedAt: now,
          notes: closeNoteForMt5("cancelled", link.mt5Ticket),
        },
        select: { id: true },
      });
      closedMt5Signals.push({
        id: signal.id,
        symbol: link.signal.symbol,
        direction: link.signal.direction,
        status: "CANCELLED",
      });
      closedSignalIds.push(signal.id);
      continue;
    }

    if (link.kind === "OPEN_POSITION" && link.signal.status === "ACTIVE" && !activeMt5Tickets.has(link.mt5Ticket)) {
      // Prefer the realized deal from trade history over the last-seen floating profit —
      // the position can move for several seconds between the last heartbeat and the actual
      // close, so `lastProfit` alone can be noticeably off from the real fill.
      const closedDeal = closedDealsByPosition.get(link.mt5Ticket);
      const profit = closedDeal?.profit ?? link.lastProfit;
      const closedAt = closedDeal?.closedAt ?? now;
      const status = typeof profit === "number" && profit < 0 ? "CLOSED_LOSS" : "CLOSED_WIN";
      const signal = await tx.signal.update({
        where: { id: link.signalId },
        data: {
          status,
          closedAt,
          notes: closeNoteForMt5("closed", link.mt5Ticket, profit),
        },
        select: { id: true },
      });
      closedMt5Signals.push({
        id: signal.id,
        symbol: link.signal.symbol,
        direction: link.signal.direction,
        status,
        profit,
      });

      if (link.journalId) {
        const result =
          typeof profit === "number"
            ? profit > 0
              ? "WIN"
              : profit < 0
                ? "LOSS"
                : "BREAKEVEN"
            : "PENDING";
        // Finalise the excursion extremes: the realized close can itself be the most
        // adverse/favorable point (TP/SL hit between heartbeats), so fold `profit` in.
        const maeProfit =
          typeof profit === "number"
            ? Math.min(link.maeProfit ?? profit, profit)
            : link.maeProfit;
        const mfeProfit =
          typeof profit === "number"
            ? Math.max(link.mfeProfit ?? profit, profit)
            : link.mfeProfit;
        await tx.tradeJournal.update({
          where: { id: link.journalId },
          data: {
            result,
            pnl: profit,
            closedAt,
            exitPrice: closedDeal?.price ?? null,
            maeProfit,
            mfeProfit,
          },
        });
      }

      closedSignalIds.push(signal.id);
    }
  }

  return { closedSignalIds, closedMt5Signals };
}
