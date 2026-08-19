import { describe, expect, it } from "vitest";
import { computeGuardOverrideStats } from "./guard-overrides";

describe("computeGuardOverrideStats", () => {
  it("trả 0 khi không có override nào", () => {
    const stats = computeGuardOverrideStats([
      { overrodeDailyLimit: false, overrodeLossStreakGuard: false },
    ]);
    expect(stats).toEqual({ dailyLimitOverrides: 0, lossStreakOverrides: 0, totalOverrides: 0 });
  });

  it("đếm riêng từng loại override và tổng", () => {
    const stats = computeGuardOverrideStats([
      { overrodeDailyLimit: true, overrodeLossStreakGuard: false },
      { overrodeDailyLimit: false, overrodeLossStreakGuard: true },
      { overrodeDailyLimit: true, overrodeLossStreakGuard: true },
    ]);
    expect(stats).toEqual({ dailyLimitOverrides: 2, lossStreakOverrides: 2, totalOverrides: 4 });
  });
});
