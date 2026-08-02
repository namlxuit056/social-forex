import { describe, expect, it } from "vitest";
import { computeMonthlyViolations, computeRiskDiscipline, type DisciplineTrade } from "./risk-discipline";

function trade(overrides: Partial<DisciplineTrade>): DisciplineTrade {
  return {
    direction: "LONG",
    entry: 1.1,
    stopLoss: 1.095,
    exitPrice: 1.095,
    result: "LOSS",
    pnl: -50,
    closedAt: "2026-01-15T00:00:00.000Z",
    ...overrides,
  };
}

describe("computeRiskDiscipline", () => {
  it("counts a loss that stops exactly at SL as compliant (R = -1)", () => {
    const stats = computeRiskDiscipline([trade({})]);
    expect(stats.evaluable).toBe(1);
    expect(stats.compliant).toBe(1);
    expect(stats.violations).toBe(0);
    expect(stats.complianceRate).toBe(100);
  });

  it("flags a loss that blew through the stop as a violation", () => {
    // exit further than SL in the losing direction => R < -1.15
    const stats = computeRiskDiscipline([
      trade({ exitPrice: 1.09, pnl: -100 }), // R = (1.09-1.1)/0.005 = -2
    ]);
    expect(stats.violations).toBe(1);
    expect(stats.compliant).toBe(0);
  });

  it("counts wins as compliant and trades without SL/exit as insufficient data", () => {
    const stats = computeRiskDiscipline([
      trade({ result: "WIN", exitPrice: 1.11, pnl: 100 }),
      trade({ stopLoss: null, exitPrice: null, pnl: null, result: "BREAKEVEN" }),
    ]);
    expect(stats.evaluable).toBe(1);
    expect(stats.compliant).toBe(1);
    expect(stats.insufficientData).toBe(1);
  });

  it("returns null compliance rate when nothing is evaluable", () => {
    const stats = computeRiskDiscipline([]);
    expect(stats.complianceRate).toBeNull();
  });
});

describe("computeMonthlyViolations", () => {
  it("groups violations by month and sorts ascending", () => {
    const rows = computeMonthlyViolations(
      [
        trade({ exitPrice: 1.09, pnl: -100, closedAt: "2026-02-01T00:00:00.000Z" }),
        trade({ exitPrice: 1.09, pnl: -100, closedAt: "2026-01-15T00:00:00.000Z" }),
        trade({ exitPrice: 1.09, pnl: -100, closedAt: "2026-01-20T00:00:00.000Z" }),
        trade({}), // compliant, should not count
      ],
      "en",
    );
    expect(rows).toEqual([
      { key: "2026-01", label: expect.any(String), violations: 2 },
      { key: "2026-02", label: expect.any(String), violations: 1 },
    ]);
  });
});
