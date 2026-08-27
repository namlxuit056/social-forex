import { describe, expect, it } from "vitest";
import {
  computeAdvancedStats,
  computeDrawdownSeries,
  type AdvancedStatsTrade,
} from "./advanced-stats";

function trade(
  result: "WIN" | "LOSS" | "BREAKEVEN" | "PENDING",
  pnl: number | null,
  opts: Partial<AdvancedStatsTrade> = {},
): AdvancedStatsTrade {
  return {
    direction: "LONG",
    entry: 1.1,
    stopLoss: 1.095,
    exitPrice: result === "WIN" ? 1.11 : result === "LOSS" ? 1.095 : null,
    result,
    pnl,
    openedAt: "2026-01-01T00:00:00.000Z",
    closedAt: "2026-01-01T00:30:00.000Z",
    ...opts,
  };
}

describe("computeAdvancedStats", () => {
  it("returns zeros/nulls for empty input", () => {
    const stats = computeAdvancedStats([]);
    expect(stats.totalTrades).toBe(0);
    expect(stats.winRate).toBeNull();
    expect(stats.profitFactor).toBeNull();
    expect(stats.maxDrawdown).toBe(0);
    expect(stats.riskOfRuin).toBeNull();
  });

  it("computes win rate, profit factor, expectancy, R and drawdown", () => {
    const trades: AdvancedStatsTrade[] = [
      trade("WIN", 100, {
        openedAt: "2026-01-01T00:00:00.000Z",
        closedAt: "2026-01-01T00:30:00.000Z",
      }),
      trade("LOSS", -50, {
        openedAt: "2026-01-02T00:00:00.000Z",
        closedAt: "2026-01-02T00:30:00.000Z",
      }),
      trade("WIN", 100, {
        openedAt: "2026-01-03T00:00:00.000Z",
        closedAt: "2026-01-03T00:30:00.000Z",
      }),
      trade("LOSS", -50, {
        openedAt: "2026-01-04T00:00:00.000Z",
        closedAt: "2026-01-04T00:30:00.000Z",
      }),
      trade("WIN", 100, {
        openedAt: "2026-01-05T00:00:00.000Z",
        closedAt: "2026-01-05T00:30:00.000Z",
      }),
    ];
    const stats = computeAdvancedStats(trades, 1000);

    expect(stats.wins).toBe(3);
    expect(stats.losses).toBe(2);
    expect(stats.winRate).toBe(60);
    expect(stats.grossProfit).toBe(300);
    expect(stats.grossLoss).toBe(100);
    expect(stats.netProfit).toBe(200);
    expect(stats.profitFactor).toBe(3);
    expect(stats.avgWin).toBe(100);
    expect(stats.avgLoss).toBe(50);
    expect(stats.expectancy).toBe(40);
    expect(stats.avgRR).toBe(0.8);
    expect(stats.maxDrawdown).toBe(-50);
    expect(stats.recoveryFactor).toBe(4);
    expect(stats.largestWin).toBe(100);
    expect(stats.largestLoss).toBe(-50);
    expect(stats.avgHoldingMinutes).toBe(30);
    expect(stats.roi).toBe(20);
    expect(stats.sharpeRatio).toBeCloseTo(0.487, 2);
    // Positive edge (avgR 0.8) + small avg risk relative to balance -> very low ruin risk
    expect(stats.riskOfRuin).not.toBeNull();
    expect(stats.riskOfRuin!).toBeLessThan(0.01);
  });

  it("computes longest streaks separately from current streak", () => {
    const trades: AdvancedStatsTrade[] = [
      trade("WIN", 10, { closedAt: "2026-01-01T00:30:00.000Z" }),
      trade("WIN", 10, { closedAt: "2026-01-02T00:30:00.000Z" }),
      trade("WIN", 10, { closedAt: "2026-01-03T00:30:00.000Z" }),
      trade("LOSS", -10, { closedAt: "2026-01-04T00:30:00.000Z" }),
      trade("LOSS", -10, { closedAt: "2026-01-05T00:30:00.000Z" }),
    ];
    const stats = computeAdvancedStats(trades);
    expect(stats.longestWinStreak).toBe(3);
    expect(stats.longestLossStreak).toBe(2);
    expect(stats.currentStreak).toEqual({ count: 2, type: "LOSS" });
  });

  it("returns null risk of ruin without account balance", () => {
    const trades: AdvancedStatsTrade[] = [
      trade("WIN", 100, { closedAt: "2026-01-01T00:30:00.000Z" }),
      trade("LOSS", -50, { closedAt: "2026-01-02T00:30:00.000Z" }),
      trade("WIN", 100, { closedAt: "2026-01-03T00:30:00.000Z" }),
      trade("LOSS", -50, { closedAt: "2026-01-04T00:30:00.000Z" }),
      trade("WIN", 100, { closedAt: "2026-01-05T00:30:00.000Z" }),
    ];
    expect(computeAdvancedStats(trades, null).riskOfRuin).toBeNull();
  });

  it("estimates 100% ruin risk when edge is negative", () => {
    const trades: AdvancedStatsTrade[] = [
      trade("LOSS", -50, { closedAt: "2026-01-01T00:30:00.000Z" }),
      trade("LOSS", -50, { closedAt: "2026-01-02T00:30:00.000Z" }),
      trade("WIN", 10, { closedAt: "2026-01-03T00:30:00.000Z", exitPrice: 1.101 }),
      trade("LOSS", -50, { closedAt: "2026-01-04T00:30:00.000Z" }),
      trade("LOSS", -50, { closedAt: "2026-01-05T00:30:00.000Z" }),
    ];
    const stats = computeAdvancedStats(trades, 1000);
    expect(stats.riskOfRuin).toBe(1);
  });

  it("ignores PENDING trades", () => {
    const trades: AdvancedStatsTrade[] = [
      trade("PENDING", null),
      trade("WIN", 100),
    ];
    const stats = computeAdvancedStats(trades);
    expect(stats.closedTrades).toBe(1);
    expect(stats.totalTrades).toBe(2);
  });
});

describe("computeDrawdownSeries", () => {
  it("tracks cumulative P/L and drawdown from the running peak", () => {
    const trades: AdvancedStatsTrade[] = [
      trade("WIN", 100, { closedAt: "2026-01-01T00:30:00.000Z" }),
      trade("LOSS", -40, { closedAt: "2026-01-02T00:30:00.000Z" }),
      trade("LOSS", -30, { closedAt: "2026-01-03T00:30:00.000Z" }),
      trade("WIN", 20, { closedAt: "2026-01-04T00:30:00.000Z" }),
    ];
    const series = computeDrawdownSeries(trades);
    expect(series.map((p) => p.cumPnl)).toEqual([100, 60, 30, 50]);
    expect(series.map((p) => p.drawdown)).toEqual([0, -40, -70, -50]);
    expect(series[0].index).toBe(1);
  });

  it("stays at 0 while equity keeps making new highs", () => {
    const series = computeDrawdownSeries([
      trade("WIN", 10, { closedAt: "2026-01-01T00:30:00.000Z" }),
      trade("WIN", 10, { closedAt: "2026-01-02T00:30:00.000Z" }),
    ]);
    expect(series.every((p) => p.drawdown === 0)).toBe(true);
  });

  it("excludes PENDING trades and orders by closedAt", () => {
    const series = computeDrawdownSeries([
      trade("PENDING", null, { closedAt: null }),
      trade("LOSS", -50, { closedAt: "2026-01-05T00:30:00.000Z" }),
      trade("WIN", 80, { closedAt: "2026-01-01T00:30:00.000Z" }),
    ]);
    expect(series).toHaveLength(2);
    expect(series.map((p) => p.cumPnl)).toEqual([80, 30]);
  });
});
