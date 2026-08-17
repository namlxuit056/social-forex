import { describe, expect, it } from "vitest";
import { countTrailingLosses, getLossStreakCooldown } from "./loss-streak";

const NOW = new Date("2026-07-18T12:00:00.000Z");

function closedAgo(hours: number): Date {
  return new Date(NOW.getTime() - hours * 60 * 60 * 1000);
}

function closedMinutesAgo(minutes: number): Date {
  return new Date(NOW.getTime() - minutes * 60 * 1000);
}

describe("countTrailingLosses", () => {
  it("đếm chuỗi LOSS liên tiếp gần nhất", () => {
    const n = countTrailingLosses(
      [
        { result: "LOSS", closedAt: closedAgo(1) },
        { result: "LOSS", closedAt: closedAgo(2) },
        { result: "WIN", closedAt: closedAgo(3) },
        { result: "LOSS", closedAt: closedAgo(4) },
      ],
      NOW,
    );
    expect(n).toBe(2);
  });

  it("WIN/BREAKEVEN reset chuỗi", () => {
    expect(
      countTrailingLosses(
        [
          { result: "WIN", closedAt: closedAgo(1) },
          { result: "LOSS", closedAt: closedAgo(2) },
        ],
        NOW,
      ),
    ).toBe(0);
    expect(
      countTrailingLosses(
        [
          { result: "BREAKEVEN", closedAt: closedAgo(1) },
          { result: "LOSS", closedAt: closedAgo(2) },
        ],
        NOW,
      ),
    ).toBe(0);
  });

  it("bỏ lệnh ngoài cửa sổ 24h", () => {
    const n = countTrailingLosses(
      [
        { result: "LOSS", closedAt: closedAgo(1) },
        { result: "LOSS", closedAt: closedAgo(30) },
      ],
      NOW,
    );
    expect(n).toBe(1);
  });

  it("bỏ qua lệnh chưa có closedAt", () => {
    const n = countTrailingLosses(
      [
        { result: "LOSS", closedAt: null },
        { result: "LOSS", closedAt: closedAgo(2) },
      ],
      NOW,
    );
    expect(n).toBe(1);
  });
});

describe("getLossStreakCooldown", () => {
  const THRESHOLD = 3;
  const COOLDOWN_MS = 30 * 60 * 1000;

  it("chưa active khi chưa chạm ngưỡng", () => {
    const result = getLossStreakCooldown(
      [
        { result: "LOSS", closedAt: closedMinutesAgo(1) },
        { result: "LOSS", closedAt: closedMinutesAgo(2) },
      ],
      NOW,
      THRESHOLD,
      COOLDOWN_MS,
    );
    expect(result).toEqual({ active: false, remainingMs: 0, lossCount: 2 });
  });

  it("active và đếm ngược từ closedAt của lệnh thua gần nhất khi chạm ngưỡng", () => {
    const result = getLossStreakCooldown(
      [
        { result: "LOSS", closedAt: closedMinutesAgo(10) },
        { result: "LOSS", closedAt: closedMinutesAgo(20) },
        { result: "LOSS", closedAt: closedMinutesAgo(30) },
      ],
      NOW,
      THRESHOLD,
      COOLDOWN_MS,
    );
    expect(result.active).toBe(true);
    expect(result.lossCount).toBe(3);
    expect(result.remainingMs).toBe(COOLDOWN_MS - 10 * 60 * 1000);
  });

  it("hết active khi đã quá thời gian cooldown kể từ lệnh thua gần nhất", () => {
    const result = getLossStreakCooldown(
      [
        { result: "LOSS", closedAt: closedMinutesAgo(45) },
        { result: "LOSS", closedAt: closedMinutesAgo(50) },
        { result: "LOSS", closedAt: closedMinutesAgo(55) },
      ],
      NOW,
      THRESHOLD,
      COOLDOWN_MS,
    );
    expect(result).toEqual({ active: false, remainingMs: 0, lossCount: 3 });
  });
});
