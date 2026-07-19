import { calcRR } from "./public-performance-math";

export type ClosedSignalForEquity = {
  status: "CLOSED_WIN" | "CLOSED_LOSS";
  direction: string;
  entry: number;
  stopLoss: number | null;
  takeProfit: number | null;
  closedAt: Date;
};

export type ProviderEquityPoint = {
  date: Date;
  r: number;
  cumR: number;
};

export type ProviderMonthlyR = {
  /** "YYYY-MM" */
  key: string;
  year: number;
  /** 0-based month */
  month: number;
  r: number;
  wins: number;
  losses: number;
};

// TODO(business): losses count as -1R and wins as full entry→TP1 RR (fallback +1R
// when SL/TP is missing). If partial closes / TP2-TP3 fills should weigh in, this
// needs real fill data from MT5 instead.
export function signalR(signal: ClosedSignalForEquity): number {
  if (signal.status === "CLOSED_LOSS") return -1;
  if (signal.stopLoss == null || signal.takeProfit == null) return 1;
  const rr = calcRR(signal.direction, signal.entry, signal.stopLoss, signal.takeProfit);
  return rr ?? 1;
}

export function buildEquityCurve(
  signals: ClosedSignalForEquity[],
): ProviderEquityPoint[] {
  const sorted = [...signals].sort(
    (a, b) => a.closedAt.getTime() - b.closedAt.getTime(),
  );
  let cumR = 0;
  return sorted.map((s) => {
    const r = signalR(s);
    cumR += r;
    return { date: s.closedAt, r, cumR };
  });
}

function monthIndex(date: Date): number {
  return date.getFullYear() * 12 + date.getMonth();
}

/** Monthly R buckets from first to last close, gap months included with r=0. */
export function buildMonthlyR(
  signals: ClosedSignalForEquity[],
): ProviderMonthlyR[] {
  if (signals.length === 0) return [];

  const byMonth = new Map<number, { r: number; wins: number; losses: number }>();
  let min = Infinity;
  let max = -Infinity;
  for (const s of signals) {
    const idx = monthIndex(s.closedAt);
    if (idx < min) min = idx;
    if (idx > max) max = idx;
    const entry = byMonth.get(idx) ?? { r: 0, wins: 0, losses: 0 };
    entry.r += signalR(s);
    if (s.status === "CLOSED_WIN") entry.wins += 1;
    else entry.losses += 1;
    byMonth.set(idx, entry);
  }

  const out: ProviderMonthlyR[] = [];
  for (let idx = min; idx <= max; idx++) {
    const year = Math.floor(idx / 12);
    const month = idx - year * 12;
    const entry = byMonth.get(idx) ?? { r: 0, wins: 0, losses: 0 };
    out.push({
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
      year,
      month,
      ...entry,
    });
  }
  return out;
}
