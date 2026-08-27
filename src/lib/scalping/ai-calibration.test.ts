import { describe, expect, it } from "vitest";
import {
  scoreBucketKey,
  plannedRFor,
  calibrateByScoreBucket,
  calibrateByConfidence,
  calibrateBySymbol,
  simulateThresholds,
  summarizeCalibration,
  type CalibrationRow,
} from "./ai-calibration";

function row(partial: Partial<CalibrationRow>): CalibrationRow {
  return {
    qualityScore: 80,
    confidence: 3,
    outcome: "WIN",
    symbol: "XAUUSD",
    direction: "LONG",
    plannedR: 1.5,
    pnl: null,
    ...partial,
  };
}

describe("scoreBucketKey", () => {
  it("buckets scores into the expected ranges", () => {
    expect(scoreBucketKey(65)).toBe("< 70");
    expect(scoreBucketKey(69.9)).toBe("< 70");
    expect(scoreBucketKey(70)).toBe("70-79");
    expect(scoreBucketKey(79.9)).toBe("70-79");
    expect(scoreBucketKey(80)).toBe("80-89");
    expect(scoreBucketKey(90)).toBe("90-100");
    expect(scoreBucketKey(100)).toBe("90-100");
  });
});

describe("plannedRFor", () => {
  it("returns -1 for a loss regardless of levels", () => {
    expect(plannedRFor("LOSS", "LONG", 100, 95, 130)).toBe(-1);
  });

  it("returns the entry->TP reward-to-risk for a win", () => {
    expect(plannedRFor("WIN", "LONG", 100, 95, 110)).toBe(2); // reward 10 / risk 5
    expect(plannedRFor("WIN", "SHORT", 100, 105, 90)).toBe(2);
  });

  it("falls back to +1R when SL or TP is missing or invalid", () => {
    expect(plannedRFor("WIN", "LONG", 100, null, 110)).toBe(1);
    expect(plannedRFor("WIN", "LONG", 100, 95, null)).toBe(1);
    expect(plannedRFor("WIN", "LONG", 100, 110, 120)).toBe(1); // risk <= 0
  });
});

describe("calibrateByScoreBucket", () => {
  it("computes win rate, avg R and pnl per bucket and skips empty buckets", () => {
    const rows: CalibrationRow[] = [
      row({ qualityScore: 72, outcome: "WIN", plannedR: 2, pnl: 10 }),
      row({ qualityScore: 75, outcome: "LOSS", plannedR: -1, pnl: -5 }),
      row({ qualityScore: 91, outcome: "WIN", plannedR: 1.5, pnl: 8 }),
      row({ qualityScore: 95, outcome: "WIN", plannedR: 2.5, pnl: 12 }),
    ];

    const buckets = calibrateByScoreBucket(rows);

    expect(buckets).toEqual([
      { key: "70-79", count: 2, wins: 1, winRatePct: 50, avgR: 0.5, totalPnl: 5, avgPnl: 2.5, pnlKnownCount: 2 },
      { key: "90-100", count: 2, wins: 2, winRatePct: 100, avgR: 2, totalPnl: 20, avgPnl: 10, pnlKnownCount: 2 },
    ]);
  });

  it("returns an empty array for no data", () => {
    expect(calibrateByScoreBucket([])).toEqual([]);
  });
});

describe("calibrateByConfidence", () => {
  it("keeps buckets ordered 1-5 and computes win rate", () => {
    const rows: CalibrationRow[] = [
      row({ confidence: 3, outcome: "LOSS", plannedR: -1, pnl: -4 }),
      row({ confidence: 3, outcome: "LOSS", plannedR: -1, pnl: -6 }),
      row({ confidence: 3, outcome: "WIN", plannedR: 3, pnl: 9 }),
      row({ confidence: 5, outcome: "WIN", plannedR: 2, pnl: 15 }),
    ];

    const buckets = calibrateByConfidence(rows);
    expect(buckets.map((b) => b.key)).toEqual(["3", "5"]);
    expect(buckets[0]).toMatchObject({ count: 3, wins: 1, winRatePct: 33.3, avgR: 0.33 });
    expect(buckets[1]).toMatchObject({ count: 1, wins: 1, winRatePct: 100, avgR: 2 });
  });
});

describe("calibrateBySymbol", () => {
  it("groups by symbol, sorted most-traded first", () => {
    const rows: CalibrationRow[] = [
      row({ symbol: "EURUSD", outcome: "LOSS", plannedR: -1 }),
      row({ symbol: "XAUUSD", outcome: "WIN", plannedR: 2 }),
      row({ symbol: "XAUUSD", outcome: "WIN", plannedR: 1 }),
      row({ symbol: "XAUUSD", outcome: "LOSS", plannedR: -1 }),
    ];

    const buckets = calibrateBySymbol(rows);
    expect(buckets.map((b) => b.key)).toEqual(["XAUUSD", "EURUSD"]);
    expect(buckets[0]).toMatchObject({ count: 3, wins: 2, winRatePct: 66.7 });
  });
});

describe("simulateThresholds", () => {
  const rows: CalibrationRow[] = [
    row({ qualityScore: 72, confidence: 3, outcome: "LOSS", plannedR: -1, pnl: -5 }),
    row({ qualityScore: 76, confidence: 3, outcome: "WIN", plannedR: 2, pnl: 10 }),
    row({ qualityScore: 82, confidence: 4, outcome: "WIN", plannedR: 1.5, pnl: 7 }),
    row({ qualityScore: 88, confidence: 4, outcome: "LOSS", plannedR: -1, pnl: -4 }),
  ];

  it("keeps only trades meeting both gates and reports the delta", () => {
    const [loose, strict] = simulateThresholds(rows, [
      { minScore: 72, minConfidence: 3 },
      { minScore: 80, minConfidence: 4 },
    ]);

    expect(loose).toMatchObject({ kept: 4, filtered: 0, wins: 2, winRatePct: 50, totalR: 1.5, totalPnl: 8 });
    expect(strict).toMatchObject({ kept: 2, filtered: 2, wins: 1, winRatePct: 50, totalR: 0.5, totalPnl: 3 });
  });

  it("reports zeros when a threshold filters everything out", () => {
    const [only] = simulateThresholds(rows, [{ minScore: 99, minConfidence: 5 }]);
    expect(only).toMatchObject({ kept: 0, filtered: 4, wins: 0, winRatePct: 0, totalR: 0, totalPnl: null });
  });
});

describe("summarizeCalibration", () => {
  it("sums and averages only trades with a known pnl", () => {
    const rows: CalibrationRow[] = [
      row({ qualityScore: 80, outcome: "WIN", pnl: 10.5 }),
      row({ qualityScore: 85, outcome: "LOSS", pnl: -4.25 }),
      row({ qualityScore: 90, confidence: 4, outcome: "WIN", pnl: null }), // no journal attached
    ];

    const result = summarizeCalibration(rows, 2);

    expect(result.totalClosed).toBe(3);
    expect(result.totalOpen).toBe(2);
    expect(result.pnlKnownCount).toBe(2);
    expect(result.totalPnl).toBe(6.25);
    expect(result.avgPnlPerTrade).toBe(3.13);
    expect(result.bySymbol).toHaveLength(1);
    expect(result.thresholdSim.length).toBeGreaterThan(0);
  });

  it("returns null totals when no trade has a known pnl", () => {
    const result = summarizeCalibration([row({ outcome: "WIN", pnl: null })], 0);
    expect(result.totalPnl).toBeNull();
    expect(result.avgPnlPerTrade).toBeNull();
    expect(result.pnlKnownCount).toBe(0);
  });

  it("returns nulls for empty input", () => {
    const result = summarizeCalibration([], 0);
    expect(result.overallWinRatePct).toBeNull();
    expect(result.totalPnl).toBeNull();
    expect(result.avgPnlPerTrade).toBeNull();
    expect(result.bySymbol).toEqual([]);
  });
});
