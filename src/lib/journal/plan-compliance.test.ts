import { describe, expect, it } from "vitest";
import { computePlanCompliance } from "./plan-compliance";

describe("computePlanCompliance", () => {
  it("trả complianceRate null khi không có ngày nào đặt maxTrades", () => {
    const stats = computePlanCompliance([], [{ openedAt: "2026-08-01T10:00:00.000Z" }]);
    expect(stats).toEqual({ evaluableDays: 0, compliantDays: 0, complianceRate: null });
  });

  it("ngày không log lệnh nào tính là tuân thủ", () => {
    const stats = computePlanCompliance(
      [{ planDate: "2026-08-01T00:00:00.000Z", maxTrades: 3 }],
      [],
    );
    expect(stats).toEqual({ evaluableDays: 1, compliantDays: 1, complianceRate: 100 });
  });

  it("vượt maxTrades trong ngày tính là vi phạm", () => {
    const stats = computePlanCompliance(
      [{ planDate: "2026-08-01T00:00:00.000Z", maxTrades: 2 }],
      [
        { openedAt: "2026-08-01T02:00:00.000Z" },
        { openedAt: "2026-08-01T10:00:00.000Z" },
        { openedAt: "2026-08-01T20:00:00.000Z" },
      ],
    );
    expect(stats.compliantDays).toBe(0);
    expect(stats.evaluableDays).toBe(1);
  });

  it("đúng bằng maxTrades vẫn tính là tuân thủ", () => {
    const stats = computePlanCompliance(
      [{ planDate: "2026-08-01T00:00:00.000Z", maxTrades: 2 }],
      [{ openedAt: "2026-08-01T02:00:00.000Z" }, { openedAt: "2026-08-01T10:00:00.000Z" }],
    );
    expect(stats.compliantDays).toBe(1);
  });

  it("chỉ đếm lệnh đúng ngày, không lẫn ngày khác", () => {
    const stats = computePlanCompliance(
      [
        { planDate: "2026-08-01T00:00:00.000Z", maxTrades: 1 },
        { planDate: "2026-08-02T00:00:00.000Z", maxTrades: 1 },
      ],
      [
        { openedAt: "2026-08-01T02:00:00.000Z" },
        { openedAt: "2026-08-02T02:00:00.000Z" },
        { openedAt: "2026-08-02T10:00:00.000Z" },
      ],
    );
    expect(stats.compliantDays).toBe(1);
    expect(stats.evaluableDays).toBe(2);
    expect(stats.complianceRate).toBe(50);
  });
});
