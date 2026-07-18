import { describe, expect, it } from "vitest";
import { countTrailingLosses } from "./loss-streak";

const NOW = new Date("2026-07-18T12:00:00.000Z");

function closedAgo(hours: number): Date {
  return new Date(NOW.getTime() - hours * 60 * 60 * 1000);
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
