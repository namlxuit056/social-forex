import { describe, expect, it } from "vitest";
import { computeDailySummary, rollupSummaries } from "./technical-rating-summary";

describe("computeDailySummary", () => {
  it("counts totals and buy/sell split", () => {
    const summary = computeDailySummary(
      [
        { symbol: "AUDUSD", signal: "buy" },
        { symbol: "EURJPY", signal: "sell" },
        { symbol: "AUDUSD", signal: "buy" },
      ],
      new Map(),
    );
    expect(summary.totalSignals).toBe(3);
    expect(summary.buySignals).toBe(2);
    expect(summary.sellSignals).toBe(1);
  });

  it("ranks topSymbols by fire count, capped at 5", () => {
    const events = [
      { symbol: "A", signal: "buy" as const },
      { symbol: "A", signal: "buy" as const },
      { symbol: "B", signal: "sell" as const },
      { symbol: "C", signal: "buy" as const },
      { symbol: "D", signal: "sell" as const },
      { symbol: "E", signal: "buy" as const },
      { symbol: "F", signal: "sell" as const },
    ];
    const summary = computeDailySummary(events, new Map());
    expect(summary.topSymbols).toHaveLength(5);
    expect(summary.topSymbols[0]).toEqual({ symbol: "A", count: 2 });
  });

  it("counts a signal as held when the current 4H score still agrees in direction", () => {
    const summary = computeDailySummary(
      [
        { symbol: "AUDUSD", signal: "buy" },
        { symbol: "EURJPY", signal: "sell" },
      ],
      new Map([
        ["AUDUSD", 0.2], // still bullish -> held
        ["EURJPY", 0.1], // reversed bullish -> not held for a sell signal
      ]),
    );
    expect(summary.heldSignals).toBe(1);
  });

  it("does not count a signal as held when there is no current score for the symbol", () => {
    const summary = computeDailySummary([{ symbol: "AUDUSD", signal: "buy" }], new Map());
    expect(summary.heldSignals).toBe(0);
  });
});

describe("rollupSummaries", () => {
  it("sums totals and merges topSymbols counts across days", () => {
    const rows = [
      {
        day: "2026-09-01",
        totalSignals: 3,
        buySignals: 2,
        sellSignals: 1,
        heldSignals: 2,
        topSymbols: [{ symbol: "AUDUSD", count: 2 }, { symbol: "EURJPY", count: 1 }],
      },
      {
        day: "2026-09-02",
        totalSignals: 2,
        buySignals: 1,
        sellSignals: 1,
        heldSignals: 1,
        topSymbols: [{ symbol: "AUDUSD", count: 1 }, { symbol: "GBPUSD", count: 1 }],
      },
    ];
    const rollup = rollupSummaries(rows);
    expect(rollup.totalSignals).toBe(5);
    expect(rollup.buySignals).toBe(3);
    expect(rollup.sellSignals).toBe(2);
    expect(rollup.heldSignals).toBe(3);
    expect(rollup.topSymbols[0]).toEqual({ symbol: "AUDUSD", count: 3 });
  });

  it("returns zeroed summary for an empty range", () => {
    const rollup = rollupSummaries([]);
    expect(rollup).toEqual({
      totalSignals: 0,
      buySignals: 0,
      sellSignals: 0,
      heldSignals: 0,
      topSymbols: [],
    });
  });
});
