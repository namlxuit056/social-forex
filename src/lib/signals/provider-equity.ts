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

/** Largest peak-to-trough drop in cumulative R (≤ 0, or 0 if equity never dipped). */
export function maxDrawdownR(points: ProviderEquityPoint[]): number {
  let peak = 0;
  let maxDD = 0;
  for (const p of points) {
    if (p.cumR > peak) peak = p.cumR;
    const dd = p.cumR - peak;
    if (dd < maxDD) maxDD = dd;
  }
  return maxDD;
}

/** Gross win R / gross loss R. Infinity when no losses and at least one win, 0 when no signals won or lost. */
export function profitFactorR(signals: ClosedSignalForEquity[]): number {
  let grossWin = 0;
  let grossLoss = 0;
  for (const s of signals) {
    const r = signalR(s);
    if (r > 0) grossWin += r;
    else grossLoss += Math.abs(r);
  }
  if (grossLoss === 0) return grossWin > 0 ? Infinity : 0;
  return grossWin / grossLoss;
}

export function avgR(signals: ClosedSignalForEquity[]): number {
  if (signals.length === 0) return 0;
  const total = signals.reduce((sum, s) => sum + signalR(s), 0);
  return total / signals.length;
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
