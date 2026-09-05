import { describe, expect, it } from "vitest";
import { computeAiReviewTrend, MIN_SAMPLE } from "./ai-review-trend";

function review(daysAgo: number, verdict: string, score: number) {
  const d = new Date("2026-09-05T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return { createdAt: d.toISOString(), verdict, score };
}

describe("computeAiReviewTrend", () => {
  it("returns zeroed result for empty input", () => {
    const trend = computeAiReviewTrend([]);
    expect(trend.sampleSize).toBe(0);
    expect(trend.avgScore).toBeNull();
    expect(trend.undisciplinedRatePct).toBeNull();
    expect(trend.scoreTrendDelta).toBeNull();
  });

  it("counts verdicts and computes overall average score", () => {
    const trend = computeAiReviewTrend([
      review(10, "disciplined", 90),
      review(9, "disciplined", 80),
      review(8, "acceptable", 60),
      review(7, "undisciplined", 30),
      review(6, "undisciplined", 20),
    ]);
    expect(trend.sampleSize).toBe(5);
    expect(trend.overall).toEqual({ disciplined: 2, acceptable: 1, undisciplined: 2 });
    expect(trend.avgScore).toBe(56);
    expect(trend.undisciplinedRatePct).toBe(40);
  });

  it("ignores unknown verdict strings when counting but still scores them", () => {
    const trend = computeAiReviewTrend([
      review(5, "weird", 50),
      review(4, "disciplined", 90),
    ]);
    expect(trend.overall).toEqual({ disciplined: 1, acceptable: 0, undisciplined: 0 });
    expect(trend.avgScore).toBe(70);
  });

  it("does not compute a trend when a half has fewer than MIN_HALF_SAMPLE reviews", () => {
    const trend = computeAiReviewTrend([
      review(4, "disciplined", 90),
      review(3, "disciplined", 90),
      review(2, "disciplined", 90),
      review(1, "disciplined", 90),
    ]);
    expect(trend.sampleSize).toBe(4);
    expect(trend.recentAvgScore).toBeNull();
    expect(trend.earlierAvgScore).toBeNull();
    expect(trend.scoreTrendDelta).toBeNull();
  });

  it("computes a positive trend when recent scores improved over earlier ones", () => {
    const trend = computeAiReviewTrend([
      review(6, "undisciplined", 30),
      review(5, "undisciplined", 20),
      review(4, "acceptable", 50),
      review(3, "disciplined", 90),
      review(2, "disciplined", 85),
      review(1, "disciplined", 95),
    ]);
    expect(trend.earlierAvgScore).toBeCloseTo(33.3, 0);
    expect(trend.recentAvgScore).toBeCloseTo(90, 0);
    expect(trend.scoreTrendDelta).toBeGreaterThan(0);
    expect(trend.recentUndisciplinedRatePct).toBe(0);
  });

  it("sorts by createdAt before splitting into halves, regardless of input order", () => {
    const trend = computeAiReviewTrend([
      review(1, "disciplined", 95),
      review(6, "undisciplined", 20),
      review(2, "disciplined", 85),
      review(5, "undisciplined", 30),
      review(3, "acceptable", 50),
      review(4, "acceptable", 50),
    ]);
    expect(trend.earlierAvgScore).toBeCloseTo(33.3, 0);
    expect(trend.recentAvgScore).toBeCloseTo(76.7, 0);
  });

  it("MIN_SAMPLE constant is exported for the UI gating threshold", () => {
    expect(MIN_SAMPLE).toBe(5);
  });
});
