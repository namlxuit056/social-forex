import { calcRR } from "@/lib/signals/public-performance-math";

export type CalibrationOutcome = "WIN" | "LOSS";

export type CalibrationRow = {
  qualityScore: number;
  confidence: number;
  outcome: CalibrationOutcome;
  symbol: string;
  direction: string;
  /** Planned R for this trade: full entry→TP reward-to-risk on a win (fallback +1R when
   * SL/TP missing), -1R on a loss. Mirrors `signalR` in provider-equity — planned, not
   * realized, since Auto-Scalp trades rarely carry partial-fill data. */
  plannedR: number;
  /** Realized P/L in account currency, from TradeJournal.pnl. Null when the trade closed
   * but the bridge never attached a journal (e.g. no heartbeat came in before close). */
  pnl: number | null;
};

/** Derive planned R from the AI's entry/SL/TP + realized outcome. */
export function plannedRFor(
  outcome: CalibrationOutcome,
  direction: string,
  entry: number,
  stopLoss: number | null,
  takeProfit: number | null,
): number {
  if (outcome === "LOSS") return -1;
  if (stopLoss == null || takeProfit == null) return 1;
  return calcRR(direction, entry, stopLoss, takeProfit) ?? 1;
}

export type CalibrationBucket = {
  key: string;
  count: number;
  wins: number;
  winRatePct: number;
  /** Mean planned R across the bucket — the expectancy signal that win rate alone hides. */
  avgR: number;
  /** Sum / mean of realized P/L across bucket trades that have a known pnl (null-pnl excluded). */
  totalPnl: number | null;
  avgPnl: number | null;
  pnlKnownCount: number;
};

const SCORE_BUCKETS: Array<{ key: string; min: number; max: number }> = [
  { key: "< 70", min: -Infinity, max: 69.999 },
  { key: "70-79", min: 70, max: 79.999 },
  { key: "80-89", min: 80, max: 89.999 },
  { key: "90-100", min: 90, max: Infinity },
];

export function scoreBucketKey(qualityScore: number): string {
  return SCORE_BUCKETS.find((b) => qualityScore >= b.min && qualityScore <= b.max)!.key;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function statsFor(rows: CalibrationRow[]): Omit<CalibrationBucket, "key"> {
  const count = rows.length;
  const wins = rows.filter((r) => r.outcome === "WIN").length;
  const knownPnls = rows.map((r) => r.pnl).filter((p): p is number => p !== null);
  const totalPnl = knownPnls.length > 0 ? round2(knownPnls.reduce((s, p) => s + p, 0)) : null;
  return {
    count,
    wins,
    winRatePct: count > 0 ? round1((wins / count) * 100) : 0,
    avgR: count > 0 ? round2(rows.reduce((s, r) => s + r.plannedR, 0) / count) : 0,
    totalPnl,
    avgPnl: totalPnl === null ? null : round2(totalPnl / knownPnls.length),
    pnlKnownCount: knownPnls.length,
  };
}

function toBuckets(
  rows: CalibrationRow[],
  keyOf: (row: CalibrationRow) => string,
  order: string[],
): CalibrationBucket[] {
  const grouped = new Map<string, CalibrationRow[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }

  return order
    .filter((key) => grouped.has(key))
    .map((key) => ({ key, ...statsFor(grouped.get(key)!) }));
}

export function calibrateByScoreBucket(rows: CalibrationRow[]): CalibrationBucket[] {
  return toBuckets(rows, (r) => scoreBucketKey(r.qualityScore), SCORE_BUCKETS.map((b) => b.key));
}

export function calibrateByConfidence(rows: CalibrationRow[]): CalibrationBucket[] {
  return toBuckets(rows, (r) => String(r.confidence), ["1", "2", "3", "4", "5"]);
}

/** Win rate + expectancy per traded symbol, most-traded first — surfaces pairs the AI
 * reads well vs. badly so an admin can prune the Auto-Scalp symbol list. */
export function calibrateBySymbol(rows: CalibrationRow[]): CalibrationBucket[] {
  const symbols = [...new Set(rows.map((r) => r.symbol))];
  const buckets = toBuckets(rows, (r) => r.symbol, symbols);
  return buckets.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

export type ThresholdCandidate = { minScore: number; minConfidence: number };

export type ThresholdSimRow = ThresholdCandidate & {
  /** Trades that would still fire at this threshold. */
  kept: number;
  /** Trades the stricter threshold would have filtered out. */
  filtered: number;
  wins: number;
  winRatePct: number;
  avgR: number;
  totalR: number;
  totalPnl: number | null;
};

/** For each candidate (minScore, minConfidence), replay the closed Auto-Scalp trades and
 * report what a stricter gate would have kept. NB: the dataset only contains trades that
 * already passed the live threshold, so this can model *raising* the bar, not lowering it. */
export function simulateThresholds(
  rows: CalibrationRow[],
  candidates: ThresholdCandidate[],
): ThresholdSimRow[] {
  return candidates.map(({ minScore, minConfidence }) => {
    const kept = rows.filter((r) => r.qualityScore >= minScore && r.confidence >= minConfidence);
    const s = statsFor(kept);
    return {
      minScore,
      minConfidence,
      kept: kept.length,
      filtered: rows.length - kept.length,
      wins: s.wins,
      winRatePct: s.winRatePct,
      avgR: s.avgR,
      totalR: round2(kept.reduce((sum, r) => sum + r.plannedR, 0)),
      totalPnl: s.totalPnl,
    };
  });
}

/** Grid replayed on the calibration page. Anchored at the default gate (72/3) and stepping
 * up on either axis — see `AutoScalpConfig` defaults in schema.prisma. */
export const DEFAULT_THRESHOLD_CANDIDATES: ThresholdCandidate[] = [
  { minScore: 72, minConfidence: 3 },
  { minScore: 75, minConfidence: 3 },
  { minScore: 78, minConfidence: 3 },
  { minScore: 80, minConfidence: 3 },
  { minScore: 85, minConfidence: 3 },
  { minScore: 75, minConfidence: 4 },
  { minScore: 80, minConfidence: 4 },
];

export type AutoScalpCalibration = {
  totalClosed: number;
  totalOpen: number;
  overallWinRatePct: number | null;
  /** Sum of pnl across trades where it's known (null-pnl trades excluded, not treated as 0). */
  totalPnl: number | null;
  pnlKnownCount: number;
  avgPnlPerTrade: number | null;
  byScoreBucket: CalibrationBucket[];
  byConfidence: CalibrationBucket[];
  bySymbol: CalibrationBucket[];
  thresholdSim: ThresholdSimRow[];
};

export function summarizeCalibration(
  rows: CalibrationRow[],
  totalOpen: number,
  candidates: ThresholdCandidate[] = DEFAULT_THRESHOLD_CANDIDATES,
): AutoScalpCalibration {
  const wins = rows.filter((r) => r.outcome === "WIN").length;
  const knownPnls = rows.map((r) => r.pnl).filter((pnl): pnl is number => pnl !== null);
  const totalPnl = knownPnls.length > 0 ? knownPnls.reduce((sum, pnl) => sum + pnl, 0) : null;

  return {
    totalClosed: rows.length,
    totalOpen,
    overallWinRatePct: rows.length > 0 ? round1((wins / rows.length) * 100) : null,
    totalPnl: totalPnl === null ? null : round2(totalPnl),
    pnlKnownCount: knownPnls.length,
    avgPnlPerTrade: totalPnl === null ? null : round2(totalPnl / knownPnls.length),
    byScoreBucket: calibrateByScoreBucket(rows),
    byConfidence: calibrateByConfidence(rows),
    bySymbol: calibrateBySymbol(rows),
    thresholdSim: simulateThresholds(rows, candidates),
  };
}
