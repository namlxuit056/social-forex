import { describe, expect, it } from "vitest";
import { computePlaybookAdherence } from "./playbook-adherence";

describe("computePlaybookAdherence", () => {
  it("tách lệnh khớp setup tốt nhất và không khớp (gồm cả chưa gắn setup)", () => {
    const stats = computePlaybookAdherence(
      [
        { result: "WIN", setup: "PULLBACK" },
        { result: "WIN", setup: "PULLBACK" },
        { result: "LOSS", setup: "PULLBACK" },
        { result: "LOSS", setup: "BREAKOUT" },
        { result: "LOSS", setup: "BREAKOUT" },
        { result: "LOSS", setup: null },
      ],
      "PULLBACK",
    );
    expect(stats.onPlaybook).toEqual({ total: 3, wins: 2, losses: 1, lossRate: 33.3 });
    expect(stats.offPlaybook).toEqual({ total: 3, wins: 0, losses: 3, lossRate: 100 });
  });

  it("lossRate null khi chưa đủ 2 lệnh W/L trong nhóm", () => {
    const stats = computePlaybookAdherence(
      [{ result: "WIN", setup: "PULLBACK" }, { result: "LOSS", setup: "BREAKOUT" }],
      "PULLBACK",
    );
    expect(stats.onPlaybook.lossRate).toBeNull();
    expect(stats.offPlaybook.lossRate).toBeNull();
  });

  it("bỏ lệnh PENDING khỏi tính toán", () => {
    const stats = computePlaybookAdherence(
      [
        { result: "PENDING", setup: "PULLBACK" },
        { result: "WIN", setup: "PULLBACK" },
        { result: "LOSS", setup: "PULLBACK" },
      ],
      "PULLBACK",
    );
    expect(stats.onPlaybook.total).toBe(2);
  });
});
