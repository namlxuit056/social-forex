import { prisma } from "@/lib/prisma";
import type { SignalStatus } from "@/generated/prisma/client";

export type AutoScalpHistoryFilter = "all" | SignalStatus;

export type AutoScalpChecklistItem = {
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
};

export type AutoScalpHistoryRow = {
  id: string;
  createdAt: Date;
  userEmail: string;
  symbol: string;
  direction: string;
  entry: number;
  stopLoss: number | null;
  takeProfit: number | null;
  lotSize: number | null;
  qualityScore: number | null;
  confidence: number | null;
  reasoning: string;
  checklist: AutoScalpChecklistItem[];
  mt5Ticket: string | null;
  signalStatus: SignalStatus | null;
  closedAt: Date | null;
  /** Realized P/L in account currency, from TradeJournal.pnl. Null while open, or if the
   * bridge never attached a journal to this trade's Mt5SignalLink. */
  pnl: number | null;
};

// AiTradeProposal doesn't have a DB relation to Signal (only a signalId string), so we
// over-fetch recent proposals, join their Signal status in a second query, then filter
// in memory. Auto-Scalp volume is low enough (per-VIP-user, hourly cron) that this is
// simpler than maintaining a denormalized status column.
const OVERFETCH_MULTIPLIER = 6;

export async function getAutoScalpHistory(
  filter: AutoScalpHistoryFilter,
  take = 50,
): Promise<AutoScalpHistoryRow[]> {
  const proposals = await prisma.aiTradeProposal.findMany({
    where: { timeframe: "M5_AUTO" },
    orderBy: { createdAt: "desc" },
    take: filter === "all" ? take : take * OVERFETCH_MULTIPLIER,
    select: {
      id: true,
      createdAt: true,
      symbol: true,
      direction: true,
      entry: true,
      stopLoss: true,
      takeProfit: true,
      lotSize: true,
      qualityScore: true,
      confidence: true,
      reasoning: true,
      checklist: true,
      mt5Ticket: true,
      signalId: true,
      user: { select: { email: true, name: true } },
    },
  });

  const signalIds = proposals.map((p) => p.signalId).filter((id): id is string => Boolean(id));
  const signals = signalIds.length
    ? await prisma.signal.findMany({
        where: { id: { in: signalIds } },
        select: {
          id: true,
          status: true,
          closedAt: true,
          mt5Link: { select: { journal: { select: { pnl: true } } } },
        },
      })
    : [];
  const signalById = new Map(signals.map((s) => [s.id, s]));

  const rows: AutoScalpHistoryRow[] = proposals.map((p) => {
    const signal = p.signalId ? signalById.get(p.signalId) : undefined;
    return {
      id: p.id,
      createdAt: p.createdAt,
      userEmail: p.user.email ?? p.user.name ?? "Unknown",
      symbol: p.symbol,
      direction: p.direction,
      entry: p.entry,
      stopLoss: p.stopLoss,
      takeProfit: p.takeProfit,
      lotSize: p.lotSize,
      qualityScore: p.qualityScore,
      confidence: p.confidence,
      reasoning: p.reasoning,
      checklist: Array.isArray(p.checklist) ? (p.checklist as unknown as AutoScalpChecklistItem[]) : [],
      mt5Ticket: p.mt5Ticket,
      signalStatus: signal?.status ?? null,
      closedAt: signal?.closedAt ?? null,
      pnl: signal?.mt5Link?.journal?.pnl ?? null,
    };
  });

  const filtered = filter === "all" ? rows : rows.filter((r) => r.signalStatus === filter);
  return filtered.slice(0, take);
}
