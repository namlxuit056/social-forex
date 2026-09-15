import { describe, expect, it } from "vitest";
import {
  computeCompoundPlanProgress,
  tradesSincePlanStart,
  type CompoundPlanConfig,
  type CompoundPlanTrade,
} from "./compound-plan";

function trade(pnl: number, closedAt: string): CompoundPlanTrade {
  return { pnl, closedAt, result: pnl >= 0 ? "WIN" : "LOSS" };
}

const basePlan: CompoundPlanConfig = {
  startingCapital: 1000,
  targetCapital: 2000,
  dailyTargetPercent: 3,
  dailyStopPercent: 2.5,
  startDate: "2026-09-01T00:00:00Z",
};

describe("tradesSincePlanStart", () => {
  it("bỏ PENDING, trade chưa đóng, và trade đóng trước startDate", () => {
    const trades: CompoundPlanTrade[] = [
      { pnl: 10, closedAt: "2026-08-31T23:59:00Z", result: "WIN" },
      { pnl: null, closedAt: null, result: "PENDING" },
      { pnl: 20, closedAt: "2026-09-01T00:00:00Z", result: "WIN" },
    ];
    const result = tradesSincePlanStart(trades, new Date("2026-09-01T00:00:00Z"));
    expect(result).toHaveLength(1);
    expect(result[0].pnl).toBe(20);
  });
});

describe("computeCompoundPlanProgress — currentCapital", () => {
  it("= startingCapital khi chưa có trade nào", () => {
    const result = computeCompoundPlanProgress(basePlan, [], new Date("2026-09-01T10:00:00Z"));
    expect(result.currentCapital).toBe(1000);
  });

  it("cộng dồn pnl các trade đóng từ startDate, bỏ trade trước startDate", () => {
    const trades = [
      trade(50, "2026-08-31T23:00:00Z"),
      trade(30, "2026-09-01T05:00:00Z"),
      trade(20, "2026-09-02T05:00:00Z"),
    ];
    const result = computeCompoundPlanProgress(
      basePlan,
      trades,
      new Date("2026-09-02T10:00:00Z"),
    );
    expect(result.currentCapital).toBe(1050);
  });
});

describe("computeCompoundPlanProgress — hôm nay", () => {
  it("todayStartCapital loại PnL của các trade đóng hôm nay", () => {
    const trades = [trade(20, "2026-09-01T05:00:00Z"), trade(30, "2026-09-02T05:00:00Z")];
    const result = computeCompoundPlanProgress(
      basePlan,
      trades,
      new Date("2026-09-02T10:00:00Z"),
    );
    expect(result.currentCapital).toBe(1050);
    expect(result.todayStartCapital).toBe(1020);
    expect(result.todayPnl).toBe(30);
  });

  it("target/dừng lỗ hôm nay = todayStartCapital * %", () => {
    const trades = [trade(20, "2026-09-01T05:00:00Z")];
    const result = computeCompoundPlanProgress(
      basePlan,
      trades,
      new Date("2026-09-02T10:00:00Z"),
    );
    expect(result.todayTargetAmount).toBeCloseTo(30.6, 5);
    expect(result.todayStopAmount).toBeCloseTo(25.5, 5);
  });

  it("todayStatus = target-hit khi PnL hôm nay >= target", () => {
    const trades = [trade(31, "2026-09-01T05:00:00Z")];
    const result = computeCompoundPlanProgress(
      basePlan,
      trades,
      new Date("2026-09-01T10:00:00Z"),
    );
    expect(result.todayStatus).toBe("target-hit");
  });

  it("todayStatus = stop-hit khi PnL hôm nay <= -dừng lỗ", () => {
    const trades = [trade(-26, "2026-09-01T05:00:00Z")];
    const result = computeCompoundPlanProgress(
      basePlan,
      trades,
      new Date("2026-09-01T10:00:00Z"),
    );
    expect(result.todayStatus).toBe("stop-hit");
  });

  it("todayStatus = in-progress khi chưa chạm target/dừng lỗ", () => {
    const trades = [trade(5, "2026-09-01T05:00:00Z")];
    const result = computeCompoundPlanProgress(
      basePlan,
      trades,
      new Date("2026-09-01T10:00:00Z"),
    );
    expect(result.todayStatus).toBe("in-progress");
  });
});

describe("computeCompoundPlanProgress — ETA", () => {
  it("dùng tốc độ thực tế khi đã có ngày giao dịch với tốc độ dương", () => {
    const plan: CompoundPlanConfig = {
      startingCapital: 1000,
      targetCapital: 1331,
      dailyTargetPercent: 10,
      dailyStopPercent: 5,
      startDate: "2026-09-01T00:00:00Z",
    };
    const trades = [trade(100, "2026-09-01T05:00:00Z")];
    const now = new Date("2026-09-01T20:00:00Z");
    const result = computeCompoundPlanProgress(plan, trades, now);
    expect(result.realizedDailyRatePercent).toBeCloseTo(10, 5);
    expect(result.eta).toEqual({
      kind: "projected",
      daysRemaining: 2,
      estimatedDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      basedOnActual: true,
    });
  });

  it("fallback theo dailyTargetPercent khi chưa có ngày giao dịch nào", () => {
    const plan: CompoundPlanConfig = {
      startingCapital: 1000,
      targetCapital: 1100,
      dailyTargetPercent: 10,
      dailyStopPercent: 5,
      startDate: "2026-09-01T00:00:00Z",
    };
    const now = new Date("2026-09-01T08:00:00Z");
    const result = computeCompoundPlanProgress(plan, [], now);
    expect(result.tradingDaysElapsed).toBe(0);
    expect(result.eta).toEqual({
      kind: "projected",
      daysRemaining: 1,
      estimatedDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
      basedOnActual: false,
    });
  });

  it("stalled khi tốc độ thực tế <= 0 và đã có ngày giao dịch", () => {
    const trades = [trade(-10, "2026-09-01T05:00:00Z")];
    const result = computeCompoundPlanProgress(
      basePlan,
      trades,
      new Date("2026-09-01T20:00:00Z"),
    );
    expect(result.eta).toEqual({ kind: "stalled" });
  });

  it("reached khi currentCapital >= targetCapital", () => {
    const trades = [trade(1200, "2026-09-01T05:00:00Z")];
    const result = computeCompoundPlanProgress(
      basePlan,
      trades,
      new Date("2026-09-01T10:00:00Z"),
    );
    expect(result.currentCapital).toBe(2200);
    expect(result.eta).toEqual({ kind: "reached" });
  });
});

describe("computeCompoundPlanProgress — mục tiêu tuần/tháng", () => {
  it("weeklyTargetPercent/Amount = lãi kép dailyTargetPercent qua 5 ngày giao dịch", () => {
    const result = computeCompoundPlanProgress(basePlan, [], new Date("2026-09-01T10:00:00Z"));
    expect(result.weeklyTargetPercent).toBeCloseTo(15.927, 2);
    expect(result.weeklyTargetAmount).toBeCloseTo(159.27, 1);
  });

  it("monthlyTargetPercent/Amount = lãi kép dailyTargetPercent qua 21 ngày giao dịch", () => {
    const result = computeCompoundPlanProgress(basePlan, [], new Date("2026-09-01T10:00:00Z"));
    expect(result.monthlyTargetPercent).toBeCloseTo(86.03, 1);
    expect(result.monthlyTargetAmount).toBeCloseTo(860.3, 0);
  });

  it("dùng currentCapital hiện tại (không phải vốn gốc) làm nền", () => {
    const trades = [trade(100, "2026-09-01T05:00:00Z")];
    const result = computeCompoundPlanProgress(basePlan, trades, new Date("2026-09-01T10:00:00Z"));
    expect(result.currentCapital).toBe(1100);
    expect(result.weeklyTargetAmount).toBeCloseTo(1100 * (result.weeklyTargetPercent / 100), 6);
    expect(result.monthlyTargetAmount).toBeCloseTo(1100 * (result.monthlyTargetPercent / 100), 6);
  });
});

describe("computeCompoundPlanProgress — progressPercent", () => {
  it("clamp về [0, 100]", () => {
    const lossResult = computeCompoundPlanProgress(
      basePlan,
      [trade(-500, "2026-09-01T05:00:00Z")],
      new Date("2026-09-01T10:00:00Z"),
    );
    expect(lossResult.progressPercent).toBe(0);

    const overResult = computeCompoundPlanProgress(
      basePlan,
      [trade(5000, "2026-09-01T05:00:00Z")],
      new Date("2026-09-01T10:00:00Z"),
    );
    expect(overResult.progressPercent).toBe(100);
  });
});
