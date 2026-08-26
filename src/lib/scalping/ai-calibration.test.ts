import { describe, expect, it } from "vitest";
import { scoreBucketKey, calibrateByScoreBucket, calibrateByConfidence, type CalibrationRow } from "./ai-calibration";

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
      { qualityScore: 72, confidence: 3, outcome: "WIN" },
      { qualityScore: 75, confidence: 3, outcome: "LOSS" },
      { qualityScore: 91, confidence: 4, outcome: "WIN" },
      { qualityScore: 95, confidence: 5, outcome: "WIN" },
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
      { qualityScore: 80, confidence: 3, outcome: "LOSS" },
      { qualityScore: 85, confidence: 3, outcome: "LOSS" },
      { qualityScore: 90, confidence: 3, outcome: "WIN" },
      { qualityScore: 92, confidence: 5, outcome: "WIN" },
    ];

    expect(calibrateByConfidence(rows)).toEqual([
      { key: "3", count: 3, wins: 1, winRatePct: 33.3 },
      { key: "5", count: 1, wins: 1, winRatePct: 100 },
    ]);
  });
});
