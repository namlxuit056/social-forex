import { describe, expect, it } from "vitest";
import {
  scoreBucketKey,
  calibrateByScoreBucket,
  calibrateByConfidence,
  summarizeCalibration,
  type CalibrationRow,
} from "./ai-calibration";

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

describe("calibrateByScoreBucket", () => {
  it("computes win rate per bucket and skips empty buckets", () => {
    const rows: CalibrationRow[] = [
      { qualityScore: 72, confidence: 3, outcome: "WIN", pnl: 10 },
      { qualityScore: 75, confidence: 3, outcome: "LOSS", pnl: -5 },
      { qualityScore: 91, confidence: 4, outcome: "WIN", pnl: 8 },
      { qualityScore: 95, confidence: 5, outcome: "WIN", pnl: 12 },
    ];

    const buckets = calibrateByScoreBucket(rows);

    expect(buckets).toEqual([
      { key: "70-79", count: 2, wins: 1, winRatePct: 50 },
      { key: "90-100", count: 2, wins: 2, winRatePct: 100 },
    ]);
  });

  it("returns an empty array for no data", () => {
    expect(calibrateByScoreBucket([])).toEqual([]);
  });
});

describe("calibrateByConfidence", () => {
  it("keeps buckets ordered 1-5 and computes win rate", () => {
    const rows: CalibrationRow[] = [
      { qualityScore: 80, confidence: 3, outcome: "LOSS", pnl: -4 },
      { qualityScore: 85, confidence: 3, outcome: "LOSS", pnl: -6 },
      { qualityScore: 90, confidence: 3, outcome: "WIN", pnl: 9 },
      { qualityScore: 92, confidence: 5, outcome: "WIN", pnl: 15 },
    ];

    expect(calibrateByConfidence(rows)).toEqual([
      { key: "3", count: 3, wins: 1, winRatePct: 33.3 },
      { key: "5", count: 1, wins: 1, winRatePct: 100 },
    ]);
  });
});

describe("summarizeCalibration", () => {
  it("sums and averages only trades with a known pnl", () => {
    const rows: CalibrationRow[] = [
      { qualityScore: 80, confidence: 3, outcome: "WIN", pnl: 10.5 },
      { qualityScore: 85, confidence: 3, outcome: "LOSS", pnl: -4.25 },
      { qualityScore: 90, confidence: 4, outcome: "WIN", pnl: null }, // no journal attached
    ];

    const result = summarizeCalibration(rows, 2);

    expect(result.totalClosed).toBe(3);
    expect(result.totalOpen).toBe(2);
    expect(result.pnlKnownCount).toBe(2);
    expect(result.totalPnl).toBe(6.25);
    expect(result.avgPnlPerTrade).toBe(3.13);
  });

  it("returns null totals when no trade has a known pnl", () => {
    const result = summarizeCalibration(
      [{ qualityScore: 80, confidence: 3, outcome: "WIN", pnl: null }],
      0,
    );
    expect(result.totalPnl).toBeNull();
    expect(result.avgPnlPerTrade).toBeNull();
    expect(result.pnlKnownCount).toBe(0);
  });

  it("returns nulls for empty input", () => {
    const result = summarizeCalibration([], 0);
    expect(result.overallWinRatePct).toBeNull();
    expect(result.totalPnl).toBeNull();
    expect(result.avgPnlPerTrade).toBeNull();
  });
});
