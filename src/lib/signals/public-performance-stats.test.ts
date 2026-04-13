import { describe, it, expect } from "vitest";
import {
  winRatePercent,
  TRADER_STATS_MIN_SAMPLE,
} from "./public-performance-math";

describe("winRatePercent", () => {
  it("returns 0 when total is 0", () => {
    expect(winRatePercent(3, 0)).toBe(0);
  });

  it("rounds to one decimal", () => {
    expect(winRatePercent(1, 3)).toBe(33.3);
    expect(winRatePercent(2, 3)).toBe(66.7);
  });

  it("handles 100%", () => {
    expect(winRatePercent(5, 5)).toBe(100);
  });
});

describe("TRADER_STATS_MIN_SAMPLE", () => {
  it("is 5 per PM spec", () => {
    expect(TRADER_STATS_MIN_SAMPLE).toBe(5);
  });
});
