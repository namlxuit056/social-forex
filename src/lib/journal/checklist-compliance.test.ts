import { describe, expect, it } from "vitest";
import { computeChecklistCompliance } from "./checklist-compliance";

const fullChecklist = {
  checkedNews: true,
  checkedLevels: true,
  checkedRisk: true,
  checkedEmotion: true,
  checkedJournal: true,
};

const partialChecklist = {
  checkedNews: true,
  checkedLevels: true,
  checkedRisk: false,
  checkedEmotion: false,
  checkedJournal: false,
};

describe("computeChecklistCompliance", () => {
  it("trả completionRate null khi chưa có ngày nào có kế hoạch", () => {
    const stats = computeChecklistCompliance([], [{ openedAt: "2026-08-01T10:00:00.000Z", result: "WIN" }]);
    expect(stats.evaluableDays).toBe(0);
    expect(stats.completionRate).toBeNull();
  });

  it("đếm đúng ngày hoàn thành đủ 5/5 mục", () => {
    const stats = computeChecklistCompliance(
      [
        { planDate: "2026-08-01T00:00:00.000Z", ...fullChecklist },
        { planDate: "2026-08-02T00:00:00.000Z", ...partialChecklist },
      ],
      [],
    );
    expect(stats.evaluableDays).toBe(2);
    expect(stats.completeDays).toBe(1);
    expect(stats.completionRate).toBe(50);
  });

  it("gom lệnh log trong ngày vào đúng nhóm complete/incomplete theo checklist ngày đó", () => {
    const stats = computeChecklistCompliance(
      [
        { planDate: "2026-08-01T00:00:00.000Z", ...fullChecklist },
        { planDate: "2026-08-02T00:00:00.000Z", ...partialChecklist },
      ],
      [
        { openedAt: "2026-08-01T02:00:00.000Z", result: "WIN" },
        { openedAt: "2026-08-01T10:00:00.000Z", result: "WIN" },
        { openedAt: "2026-08-02T02:00:00.000Z", result: "LOSS" },
        { openedAt: "2026-08-02T10:00:00.000Z", result: "LOSS" },
      ],
    );
    expect(stats.complete).toEqual({ total: 2, wins: 2, losses: 0, winRate: 100 });
    expect(stats.incomplete).toEqual({ total: 2, wins: 0, losses: 2, winRate: 0 });
  });

  it("winRate null khi nhóm có dưới 2 lệnh W/L", () => {
    const stats = computeChecklistCompliance(
      [{ planDate: "2026-08-01T00:00:00.000Z", ...fullChecklist }],
      [{ openedAt: "2026-08-01T02:00:00.000Z", result: "WIN" }],
    );
    expect(stats.complete.winRate).toBeNull();
  });

  it("bỏ qua lệnh PENDING khi tính winRate", () => {
    const stats = computeChecklistCompliance(
      [{ planDate: "2026-08-01T00:00:00.000Z", ...fullChecklist }],
      [
        { openedAt: "2026-08-01T02:00:00.000Z", result: "WIN" },
        { openedAt: "2026-08-01T04:00:00.000Z", result: "LOSS" },
        { openedAt: "2026-08-01T06:00:00.000Z", result: "PENDING" },
      ],
    );
    expect(stats.complete).toEqual({ total: 2, wins: 1, losses: 1, winRate: 50 });
  });

  it("chỉ gom lệnh đúng ngày, không lẫn ngày khác", () => {
    const stats = computeChecklistCompliance(
      [{ planDate: "2026-08-01T00:00:00.000Z", ...fullChecklist }],
      [
        { openedAt: "2026-08-01T02:00:00.000Z", result: "WIN" },
        { openedAt: "2026-08-02T02:00:00.000Z", result: "LOSS" },
      ],
    );
    expect(stats.complete.total).toBe(1);
  });
});
