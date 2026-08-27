import { describe, expect, it } from "vitest";
import {
  computeGoalProgress,
  goalMonthStart,
  tradesInGoalMonth,
  type GoalTrade,
} from "./goal-progress";

// LONG entry 100, SL 90 → 1R = 10.
function t(
  result: "WIN" | "LOSS" | "BREAKEVEN" | "PENDING",
  pnl: number | null,
  closedAt: string | null,
  exitPrice: number | null = result === "WIN" ? 110 : result === "LOSS" ? 90 : null,
): GoalTrade {
  return { direction: "LONG", entry: 100, stopLoss: 90, exitPrice, result, pnl, closedAt };
}

describe("goalMonthStart", () => {
  it("returns the first of the month at UTC midnight", () => {
    expect(goalMonthStart(new Date("2026-08-27T15:00:00Z")).toISOString()).toBe(
      "2026-08-01T00:00:00.000Z",
    );
  });
});

describe("tradesInGoalMonth", () => {
  it("keeps only closed trades closed within the month", () => {
    const month = goalMonthStart(new Date("2026-08-15T00:00:00Z"));
    const trades = [
      t("WIN", 10, "2026-08-01T00:00:00Z"),
      t("LOSS", -10, "2026-08-31T23:59:00Z"),
      t("WIN", 10, "2026-09-01T00:00:00Z"), // next month
      t("WIN", 10, "2026-07-31T23:00:00Z"), // prev month
      t("PENDING", null, null),
    ];
    expect(tradesInGoalMonth(trades, month)).toHaveLength(2);
  });
});

describe("computeGoalProgress", () => {
  it("only reports metrics that have a target set", () => {
    const p = computeGoalProgress(
      { targetWinRate: 60, targetAvgR: null, targetNetPnl: null, targetTrades: null },
      [t("WIN", 10, "2026-08-01T00:00:00Z"), t("LOSS", -10, "2026-08-02T00:00:00Z")],
    );
    expect(p.items).toHaveLength(1);
    expect(p.items[0].metric).toBe("winRate");
    expect(p.totalCount).toBe(1);
  });

  it("computes win rate, avg R, net P/L and trade count", () => {
    const trades = [
      t("WIN", 20, "2026-08-01T00:00:00Z", 120), // +2R
      t("WIN", 10, "2026-08-02T00:00:00Z", 110), // +1R
      t("LOSS", -10, "2026-08-03T00:00:00Z", 90), // -1R
      t("LOSS", -10, "2026-08-04T00:00:00Z", 90), // -1R
    ];
    const p = computeGoalProgress(
      { targetWinRate: 50, targetAvgR: 0.5, targetNetPnl: 100, targetTrades: 4 },
      trades,
    );
    const by = Object.fromEntries(p.items.map((i) => [i.metric, i]));
    expect(by.winRate.actual).toBe(50);
    expect(by.winRate.met).toBe(true);
    expect(by.avgR.actual).toBe(0.25); // (2+1-1-1)/4
    expect(by.avgR.met).toBe(false);
    expect(by.netPnl.actual).toBe(10);
    expect(by.netPnl.met).toBe(false);
    expect(by.trades.actual).toBe(4);
    expect(by.trades.met).toBe(true);
    expect(p.metCount).toBe(2);
  });

  it("clamps the progress ratio to 0..1", () => {
    const p = computeGoalProgress(
      { targetWinRate: null, targetAvgR: null, targetNetPnl: 100, targetTrades: null },
      [t("WIN", 500, "2026-08-01T00:00:00Z")],
    );
    expect(p.items[0].ratio).toBe(1);
    expect(p.items[0].met).toBe(true);
  });

  it("treats a non-positive target as met when actual >= target", () => {
    const p = computeGoalProgress(
      { targetWinRate: null, targetAvgR: null, targetNetPnl: 0, targetTrades: null },
      [t("WIN", 5, "2026-08-01T00:00:00Z"), t("LOSS", -3, "2026-08-02T00:00:00Z")],
    );
    expect(p.items[0].actual).toBe(2);
    expect(p.items[0].met).toBe(true);
    expect(p.items[0].ratio).toBe(1);
  });
});
