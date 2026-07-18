import { describe, expect, it } from "vitest";
import {
  buildBuckets,
  rangeForMode,
  tradesInRange,
  type JournalChartTrade,
} from "./chart-buckets";

function trade(overrides: Partial<JournalChartTrade>): JournalChartTrade {
  return {
    id: "t1",
    result: "WIN",
    pnl: 100,
    openedAt: "2026-02-10T08:00:00.000Z",
    closedAt: "2026-02-10T10:00:00.000Z",
    ...overrides,
  };
}

describe("rangeForMode — custom", () => {
  it("chuẩn hóa from về đầu tháng khi unit là month", () => {
    const { from, unit } = rangeForMode("custom", "2026-01-31", "2026-12-31");
    expect(unit).toBe("month");
    expect(from.getDate()).toBe(1);
    expect(from.getMonth()).toBe(0);
  });

  it("chuẩn hóa from về đầu năm khi unit là year", () => {
    const { from, unit } = rangeForMode("custom", "2024-06-15", "2026-12-31");
    expect(unit).toBe("year");
    expect(from.getMonth()).toBe(0);
    expect(from.getDate()).toBe(1);
  });

  it("giữ nguyên from khi unit là day", () => {
    const { from, unit } = rangeForMode("custom", "2026-01-31", "2026-02-10");
    expect(unit).toBe("day");
    expect(from.getDate()).toBe(31);
  });
});

describe("buildBuckets — regression: mất bucket tháng 2", () => {
  it("range bắt đầu 31/01 vẫn có bucket tháng 2 và giữ trade trong đó", () => {
    const buckets = buildBuckets(
      [trade({ pnl: 150 })],
      "vi",
      "custom",
      "2026-01-31",
      "2026-12-31",
    );
    const feb = buckets.find((b) => b.key === "2026-02");
    expect(feb).toBeDefined();
    expect(feb!.trades).toBe(1);
    expect(feb!.pnl).toBe(150);
    // Đủ 12 tháng, không tháng nào bị nhảy cóc
    expect(buckets).toHaveLength(12);
  });
});

describe("tradesInRange", () => {
  it("lọc theo range và bỏ PENDING", () => {
    const inRange = tradesInRange(
      [
        trade({}),
        trade({ id: "t2", closedAt: "2025-06-01T00:00:00.000Z", openedAt: "2025-06-01T00:00:00.000Z" }),
        trade({ id: "t3", result: "PENDING", closedAt: null }),
      ],
      "custom",
      "2026-01-01",
      "2026-03-01",
    );
    expect(inRange.map((t) => t.id)).toEqual(["t1"]);
  });
});
