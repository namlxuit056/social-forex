import { describe, expect, it } from "vitest";
import { computeRStats, realizedR, type RTrade } from "./r-multiple";

describe("realizedR", () => {
  it("LONG: chốt tại 2R", () => {
    expect(
      realizedR({ direction: "LONG", entry: 100, stopLoss: 90, exitPrice: 120 }),
    ).toBe(2);
  });

  it("SHORT: dính SL = -1R", () => {
    expect(
      realizedR({ direction: "SHORT", entry: 100, stopLoss: 110, exitPrice: 110 }),
    ).toBe(-1);
  });

  it("null khi thiếu SL hoặc exit, hoặc SL trùng entry", () => {
    expect(
      realizedR({ direction: "LONG", entry: 100, stopLoss: null, exitPrice: 120 }),
    ).toBeNull();
    expect(
      realizedR({ direction: "LONG", entry: 100, stopLoss: 90, exitPrice: null }),
    ).toBeNull();
    expect(
      realizedR({ direction: "LONG", entry: 100, stopLoss: 100, exitPrice: 120 }),
    ).toBeNull();
  });
});

describe("computeRStats", () => {
  const base = { direction: "LONG", entry: 100, stopLoss: 90 };

  it("avgR là trung bình R của lệnh đóng, bỏ PENDING", () => {
    const trades: RTrade[] = [
      { ...base, exitPrice: 120, result: "WIN", pnl: 200 },
      { ...base, exitPrice: 90, result: "LOSS", pnl: -100 },
      { ...base, exitPrice: 130, result: "PENDING", pnl: null },
    ];
    const stats = computeRStats(trades);
    expect(stats.rCount).toBe(2);
    expect(stats.avgR).toBe(0.5);
  });

  it("payoffRatio = TB lãi / TB lỗ", () => {
    const trades: RTrade[] = [
      { ...base, exitPrice: null, result: "WIN", pnl: 300 },
      { ...base, exitPrice: null, result: "WIN", pnl: 100 },
      { ...base, exitPrice: null, result: "LOSS", pnl: -100 },
    ];
    expect(computeRStats(trades).payoffRatio).toBe(2);
  });

  it("null khi không có dữ liệu", () => {
    const stats = computeRStats([]);
    expect(stats.avgR).toBeNull();
    expect(stats.payoffRatio).toBeNull();
    expect(stats.rCount).toBe(0);
  });
});
