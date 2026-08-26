export type CalibrationOutcome = "WIN" | "LOSS";

export type CalibrationRow = {
  qualityScore: number;
  confidence: number;
  outcome: CalibrationOutcome;
  /** Realized P/L in account currency, from TradeJournal.pnl. Null when the trade closed
   * but the bridge never attached a journal (e.g. no heartbeat came in before close). */
  pnl: number | null;
};

export type CalibrationBucket = {
  key: string;
  count: number;
  wins: number;
  winRatePct: number;
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

function toBuckets(rows: CalibrationRow[], keyOf: (row: CalibrationRow) => string, order: string[]): CalibrationBucket[] {
  const grouped = new Map<string, { count: number; wins: number }>();
  for (const row of rows) {
    const key = keyOf(row);
    const entry = grouped.get(key) ?? { count: 0, wins: 0 };
    entry.count += 1;
    if (row.outcome === "WIN") entry.wins += 1;
    grouped.set(key, entry);
  }

  return order
    .filter((key) => grouped.has(key))
    .map((key) => {
      const { count, wins } = grouped.get(key)!;
      return { key, count, wins, winRatePct: Math.round((wins / count) * 1000) / 10 };
    });
}

export function calibrateByScoreBucket(rows: CalibrationRow[]): CalibrationBucket[] {
  return toBuckets(rows, (r) => scoreBucketKey(r.qualityScore), SCORE_BUCKETS.map((b) => b.key));
}

export function calibrateByConfidence(rows: CalibrationRow[]): CalibrationBucket[] {
  return toBuckets(rows, (r) => String(r.confidence), ["1", "2", "3", "4", "5"]);
}

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
};

export function summarizeCalibration(rows: CalibrationRow[], totalOpen: number): AutoScalpCalibration {
  const wins = rows.filter((r) => r.outcome === "WIN").length;
  const knownPnls = rows.map((r) => r.pnl).filter((pnl): pnl is number => pnl !== null);
  const totalPnl = knownPnls.length > 0 ? knownPnls.reduce((sum, pnl) => sum + pnl, 0) : null;

  return {
    totalClosed: rows.length,
    totalOpen,
    overallWinRatePct: rows.length > 0 ? Math.round((wins / rows.length) * 1000) / 10 : null,
    totalPnl: totalPnl === null ? null : Math.round(totalPnl * 100) / 100,
    pnlKnownCount: knownPnls.length,
    avgPnlPerTrade: totalPnl === null ? null : Math.round((totalPnl / knownPnls.length) * 100) / 100,
    byScoreBucket: calibrateByScoreBucket(rows),
    byConfidence: calibrateByConfidence(rows),
  };
}
