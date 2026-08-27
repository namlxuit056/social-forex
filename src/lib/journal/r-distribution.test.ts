import { describe, expect, it } from "vitest";
import { computeRMultipleDistribution } from "./r-distribution";
import type { RTrade } from "./r-multiple";

// realizedR = (exit - entry) / |entry - SL| for LONG. entry 100, SL 90 → 1R = 10.
function longTrade(exit: number, result = exit >= 100 ? "WIN" : "LOSS"): RTrade {
  return { direction: "LONG", entry: 100, stopLoss: 90, exitPrice: exit, result, pnl: exit - 100 };
}

describe("computeRMultipleDistribution", () => {
  it("counts only trades with a computable R", () => {
    const trades: RTrade[] = [
      longTrade(120), // +2R
      { direction: "LONG", entry: 100, stopLoss: null, exitPrice: 110, result: "WIN", pnl: 10 }, // no SL
      { direction: "LONG", entry: 100, stopLoss: 90, exitPrice: null, result: "PENDING", pnl: null }, // open
    ];
    const dist = computeRMultipleDistribution(trades);
    expect(dist.total).toBe(1);
  });

  it("places R values in the right buckets (min < r <= max)", () => {
    const dist = computeRMultipleDistribution([
      longTrade(70), // -3R → < -2R
      longTrade(85), // -1.5R → -2..-1
      longTrade(100), // 0R → -1..0
      longTrade(110), // +1R → 0..1R
      longTrade(120), // +2R → 1..2R
      longTrade(140), // +4R → > 2R
    ]);
    const by = Object.fromEntries(dist.buckets.map((b) => [b.key, b.count]));
    expect(by).toEqual({
      "lt-2": 1,
      "-2to-1": 1,
      "-1to0": 1,
      "0to1": 1,
      "1to2": 1,
      gt2: 1,
    });
    expect(dist.total).toBe(6);
  });

  it("boundary R lands in the lower bucket for exact -2R and 0, upper for exact 1R", () => {
    const dist = computeRMultipleDistribution([
      longTrade(80), // exactly -2R
      longTrade(110), // exactly +1R
    ]);
    const by = Object.fromEntries(dist.buckets.map((b) => [b.key, b.count]));
    expect(by["lt-2"]).toBe(1); // -2R → r <= -2
    expect(by["0to1"]).toBe(1); // +1R → r <= 1
  });

  it("returns all six buckets even with no trades", () => {
    const dist = computeRMultipleDistribution([]);
    expect(dist.buckets).toHaveLength(6);
    expect(dist.total).toBe(0);
    expect(dist.buckets.every((b) => b.count === 0)).toBe(true);
  });
});
