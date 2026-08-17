import { describe, expect, it } from "vitest";
import { isOverDailyTradeLimit, utcDayRange } from "./daily-limit";

describe("isOverDailyTradeLimit", () => {
  it("không giới hạn khi maxTrades null/undefined/0", () => {
    expect(isOverDailyTradeLimit(10, null)).toBe(false);
    expect(isOverDailyTradeLimit(10, undefined)).toBe(false);
    expect(isOverDailyTradeLimit(10, 0)).toBe(false);
  });

  it("chưa vượt khi số lệnh nhỏ hơn max", () => {
    expect(isOverDailyTradeLimit(2, 3)).toBe(false);
  });

  it("vượt khi số lệnh bằng hoặc lớn hơn max", () => {
    expect(isOverDailyTradeLimit(3, 3)).toBe(true);
    expect(isOverDailyTradeLimit(5, 3)).toBe(true);
  });
});

describe("utcDayRange", () => {
  it("trả về khoảng 00:00–24:00 UTC chứa ngày của date", () => {
    const { start, end } = utcDayRange(new Date("2026-08-17T15:42:10.000Z"));
    expect(start.toISOString()).toBe("2026-08-17T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-08-18T00:00:00.000Z");
  });

  it("ngày gần ranh giới tháng không bị overflow", () => {
    const { start, end } = utcDayRange(new Date("2026-08-31T23:59:59.000Z"));
    expect(start.toISOString()).toBe("2026-08-31T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });
});
