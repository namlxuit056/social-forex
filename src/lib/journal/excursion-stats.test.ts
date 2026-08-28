import { describe, it, expect } from "vitest";
import { computeExcursionStats, type ExcursionTrade } from "./excursion-stats";

const t = (over: Partial<ExcursionTrade>): ExcursionTrade => ({
  result: "WIN",
  pnl: 100,
  maeProfit: -20,
  mfeProfit: 150,
  ...over,
});

describe("computeExcursionStats", () => {
  it("ignores trades without both MAE and MFE, and open trades", () => {
    const s = computeExcursionStats([
      t({ maeProfit: null }),
      t({ mfeProfit: null }),
      t({ result: "PENDING" }),
    ]);
    expect(s.sampleSize).toBe(0);
    expect(s.avgMfeCapturePct).toBeNull();
    expect(s.avgHeatOnWinners).toBeNull();
    expect(s.avgGiveBackOnLosers).toBeNull();
  });

  it("computes MFE capture ratio for winners, clamped to 1", () => {
    const s = computeExcursionStats([
      t({ result: "WIN", pnl: 75, mfeProfit: 150 }), // 0.5
      t({ result: "WIN", pnl: 200, mfeProfit: 100 }), // clamp -> 1
    ]);
    expect(s.winnersAnalyzed).toBe(2);
    expect(s.avgMfeCapturePct).toBeCloseTo(0.75);
  });

  it("averages the deepest heat on winners, counting zero for winners that never went negative", () => {
    const s = computeExcursionStats([
      t({ result: "WIN", maeProfit: -40 }),
      t({ result: "WIN", maeProfit: 10 }), // never underwater -> 0
    ]);
    expect(s.avgHeatOnWinners).toBeCloseTo(-20);
  });

  it("flags give-back losers: were green, closed red", () => {
    const s = computeExcursionStats([
      t({ result: "LOSS", pnl: -50, maeProfit: -60, mfeProfit: 80 }),
      t({ result: "LOSS", pnl: -30, maeProfit: -30, mfeProfit: 0 }), // never green
      t({ result: "LOSS", pnl: -40, maeProfit: -40, mfeProfit: 120 }),
    ]);
    expect(s.losersAnalyzed).toBe(3);
    expect(s.giveBackCount).toBe(2);
    expect(s.avgGiveBackOnLosers).toBeCloseTo(100);
  });

  it("excludes breakevens from winner/loser buckets but counts them in sample", () => {
    const s = computeExcursionStats([t({ result: "BREAKEVEN", pnl: 0 })]);
    expect(s.sampleSize).toBe(1);
    expect(s.winnersAnalyzed).toBe(0);
    expect(s.losersAnalyzed).toBe(0);
  });
});
