import { describe, it, expect } from "vitest";
import {
  winRatePercent,
  TRADER_STATS_MIN_SAMPLE,
  calcRR,
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

describe("calcRR", () => {
  it("BUY with risk=50, reward=100 → 2", () => {
    // entry=150, SL=100, TP=250 → risk=50, reward=100
    expect(calcRR("BUY", 150, 100, 250)).toBe(2);
  });

  it("SELL with risk=30, reward=90 → 3", () => {
    // entry=100, SL=130, TP=10 → risk=30, reward=90
    expect(calcRR("SELL", 100, 130, 10)).toBe(3);
  });

  it("returns null when risk <= 0", () => {
    // BUY where SL > entry → negative risk
    expect(calcRR("BUY", 100, 150, 200)).toBeNull();
  });

  it("returns null when reward <= 0", () => {
    // BUY where TP < entry → negative reward
    expect(calcRR("BUY", 150, 100, 130)).toBeNull();
  });
});
