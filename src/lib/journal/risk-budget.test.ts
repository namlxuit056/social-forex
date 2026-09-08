import { describe, expect, it } from "vitest";
import { checkDailyRiskBudget, computeTradeRiskAmount } from "./risk-budget";

describe("computeTradeRiskAmount", () => {
  it("null khi thiếu entry / SL / lot", () => {
    const base = { symbol: "EURUSD", direction: "LONG" as const, entry: 1.1, stopLoss: 1.09, lotSize: 1 };
    expect(computeTradeRiskAmount({ ...base, entry: null })).toBeNull();
    expect(computeTradeRiskAmount({ ...base, stopLoss: null })).toBeNull();
    expect(computeTradeRiskAmount({ ...base, lotSize: 0 })).toBeNull();
  });

  it("tính ~ đúng risk $ cho EURUSD 1 lot, SL 100 pip", () => {
    // 1.1000 -> 1.0900 = 100 pip, ~10 $/pip/lot => ~1000 $
    const risk = computeTradeRiskAmount({
      symbol: "EURUSD",
      direction: "LONG",
      entry: 1.1,
      stopLoss: 1.09,
      lotSize: 1,
    });
    expect(risk).not.toBeNull();
    expect(risk!).toBeGreaterThan(900);
    expect(risk!).toBeLessThan(1100);
  });

  it("SHORT: SL nằm trên entry", () => {
    const risk = computeTradeRiskAmount({
      symbol: "EURUSD",
      direction: "SHORT",
      entry: 1.1,
      stopLoss: 1.11,
      lotSize: 1,
    });
    expect(risk).not.toBeNull();
    expect(risk!).toBeGreaterThan(0);
  });

  it("null khi SL sai chiều (risk <= 0)", () => {
    expect(
      computeTradeRiskAmount({
        symbol: "EURUSD",
        direction: "LONG",
        entry: 1.1,
        stopLoss: 1.11,
        lotSize: 1,
      }),
    ).toBeNull();
  });
});

describe("checkDailyRiskBudget", () => {
  const base = { riskUsedToday: 0, newRisk: 100, maxRiskPercent: 2, equity: 10_000 };

  it("null khi không có plan limit / equity / newRisk", () => {
    expect(checkDailyRiskBudget({ ...base, maxRiskPercent: null })).toBeNull();
    expect(checkDailyRiskBudget({ ...base, equity: 0 })).toBeNull();
    expect(checkDailyRiskBudget({ ...base, newRisk: null })).toBeNull();
  });

  it("null khi tổng risk còn trong ngân sách", () => {
    // budget = 2% * 10000 = 200; used 50 + new 100 = 150 <= 200
    expect(checkDailyRiskBudget({ ...base, riskUsedToday: 50, newRisk: 100 })).toBeNull();
  });

  it("cảnh báo khi vượt ngân sách", () => {
    const w = checkDailyRiskBudget({ ...base, riskUsedToday: 150, newRisk: 100 });
    expect(w).not.toBeNull();
    expect(w!.budget).toBe(200);
    expect(w!.projectedRisk).toBe(250);
    expect(w!.projectedPct).toBe(2.5);
  });

  it("riskUsedToday âm được kẹp về 0", () => {
    const w = checkDailyRiskBudget({ ...base, riskUsedToday: -999, newRisk: 100 });
    expect(w).toBeNull();
  });
});
