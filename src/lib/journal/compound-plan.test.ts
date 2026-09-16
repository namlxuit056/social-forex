import { describe, expect, it } from "vitest";
import {
  computeCompoundPlanDailyBreakdown,
  computeCompoundPlanDailySummary,
  computeCompoundPlanProgress,
  tradesSincePlanStart,
  type CompoundPlanConfig,
  type CompoundPlanDay,
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

  it("neo theo vốn đầu tuần (thứ 2 UTC) / đầu tháng, loại PnL đã kiếm trong tuần/tháng này — không phải currentCapital", () => {
    const plan: CompoundPlanConfig = { ...basePlan, startDate: "2026-08-01T00:00:00Z" };
    const trades = [
      trade(-50, "2026-08-25T00:00:00Z"), // tuần trước, tháng trước
      trade(80, "2026-08-31T00:00:00Z"), // đúng thứ 2 đầu tuần này, nhưng vẫn tháng 8
      trade(200, "2026-09-02T00:00:00Z"), // trong tuần này và tháng 9
    ];
    const now = new Date("2026-09-03T12:00:00Z"); // thứ 5, tuần 31/8–6/9, tháng 9
    const result = computeCompoundPlanProgress(plan, trades, now);

    expect(result.currentCapital).toBe(1230); // 1000 - 50 + 80 + 200
    // weekStartCapital = currentCapital - (80 + 200) = 950
    expect(result.weeklyTargetAmount).toBeCloseTo(950 * (result.weeklyTargetPercent / 100), 6);
    // monthStartCapital = currentCapital - 200 = 1030 (trade 31/8 thuộc tháng 8, không tính)
    expect(result.monthlyTargetAmount).toBeCloseTo(1030 * (result.monthlyTargetPercent / 100), 6);
  });

  it("giữ nguyên khi xem lại giữa tuần/tháng dù có thêm trade mới trong cùng kỳ (không đổi mỗi lần check)", () => {
    const plan: CompoundPlanConfig = { ...basePlan, startDate: "2026-08-01T00:00:00Z" };
    const beforeNewTrade = computeCompoundPlanProgress(
      plan,
      [trade(80, "2026-08-31T00:00:00Z")],
      new Date("2026-09-01T06:00:00Z"),
    );
    const afterNewTrade = computeCompoundPlanProgress(
      plan,
      [trade(80, "2026-08-31T00:00:00Z"), trade(40, "2026-09-03T06:00:00Z")],
      new Date("2026-09-03T12:00:00Z"),
    );
    // trade 31/8 thuộc tuần này ở cả 2 lần check (31/8–6/9) nên weekStartCapital không đổi
    expect(afterNewTrade.weeklyTargetAmount).toBeCloseTo(beforeNewTrade.weeklyTargetAmount, 6);
  });
});

describe("computeCompoundPlanDailyBreakdown", () => {
  it("liệt kê từng ngày Thứ 2–6 từ startDate đến hôm nay, mới nhất trước", () => {
    const result = computeCompoundPlanDailyBreakdown(
      basePlan,
      [],
      new Date("2026-09-02T10:00:00Z"), // Thứ 4
    );
    expect(result.map((d) => d.date.toISOString().slice(0, 10))).toEqual([
      "2026-09-02",
      "2026-09-01",
    ]);
    expect(result[0]).toMatchObject({ startCapital: 1000, targetAmount: 30, stopAmount: 25, pnl: 0, endCapital: 1000, status: "no-trade" });
  });

  it("bỏ Thứ 7/CN", () => {
    const result = computeCompoundPlanDailyBreakdown(
      basePlan,
      [],
      new Date("2026-09-07T10:00:00Z"), // Thứ 2 tuần sau
    );
    expect(result.map((d) => d.date.toISOString().slice(0, 10))).toEqual([
      "2026-09-07",
      "2026-09-04",
      "2026-09-03",
      "2026-09-02",
      "2026-09-01",
    ]);
  });

  it("target/stop tính trên vốn đầu ngày đó (compound theo endCapital ngày trước)", () => {
    const trades = [trade(30, "2026-09-01T05:00:00Z")]; // đúng target ngày 1/9 (1000*3%)
    const result = computeCompoundPlanDailyBreakdown(basePlan, trades, new Date("2026-09-02T10:00:00Z"));
    const day1 = result.find((d) => d.date.toISOString().slice(0, 10) === "2026-09-01")!;
    const day2 = result.find((d) => d.date.toISOString().slice(0, 10) === "2026-09-02")!;
    expect(day1).toMatchObject({ startCapital: 1000, pnl: 30, endCapital: 1030, status: "target-hit" });
    expect(day2.startCapital).toBe(1030);
    expect(day2.targetAmount).toBeCloseTo(30.9, 5);
  });

  it("status = stop-hit khi PnL ngày đó <= -dừng lỗ", () => {
    const trades = [trade(-26, "2026-09-01T05:00:00Z")];
    const result = computeCompoundPlanDailyBreakdown(basePlan, trades, new Date("2026-09-01T10:00:00Z"));
    expect(result[0].status).toBe("stop-hit");
  });

  it("status = in-progress khi có PnL nhưng chưa chạm target/dừng lỗ", () => {
    const trades = [trade(5, "2026-09-01T05:00:00Z")];
    const result = computeCompoundPlanDailyBreakdown(basePlan, trades, new Date("2026-09-01T10:00:00Z"));
    expect(result[0].status).toBe("in-progress");
  });
});

describe("computeCompoundPlanDailySummary", () => {
  function day(status: CompoundPlanDay["status"], dateStr: string): CompoundPlanDay {
    return {
      date: new Date(dateStr),
      startCapital: 1000,
      targetAmount: 30,
      stopAmount: 25,
      pnl: 0,
      endCapital: 1000,
      status,
    };
  }

  it("đếm số ngày đạt target / dính stop trên tổng số ngày", () => {
    const days = [
      day("target-hit", "2026-09-04"),
      day("stop-hit", "2026-09-03"),
      day("no-trade", "2026-09-02"),
      day("target-hit", "2026-09-01"),
    ];
    const result = computeCompoundPlanDailySummary(days);
    expect(result).toMatchObject({ totalDays: 4, targetHitDays: 2, stopHitDays: 1 });
  });

  it("longestTargetStreak = chuỗi ngày liên tiếp đạt target dài nhất theo thời gian, không phụ thuộc thứ tự mảng đầu vào", () => {
    const days = [
      day("stop-hit", "2026-09-08"),
      day("target-hit", "2026-09-07"), // T2 — liền sau 4/9 (T6) vì T7/CN không nằm trong mảng
      day("target-hit", "2026-09-04"),
      day("target-hit", "2026-09-03"),
      day("in-progress", "2026-09-02"), // chặn chuỗi trước đó
      day("target-hit", "2026-09-01"),
    ];
    const result = computeCompoundPlanDailySummary(days);
    expect(result.longestTargetStreak).toBe(3); // 3/9, 4/9, 7/9 liên tiếp; 1/9 đứng riêng
  });

  it("trả về 0 hết khi mảng rỗng", () => {
    const result = computeCompoundPlanDailySummary([]);
    expect(result).toEqual({ totalDays: 0, targetHitDays: 0, stopHitDays: 0, longestTargetStreak: 0 });
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
