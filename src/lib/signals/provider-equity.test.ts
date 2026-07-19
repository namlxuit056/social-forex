import { describe, expect, it } from "vitest";
import {
  buildEquityCurve,
  buildMonthlyR,
  signalR,
  type ClosedSignalForEquity,
} from "./provider-equity";

function sig(
  overrides: Partial<ClosedSignalForEquity> & { closedAt: Date },
): ClosedSignalForEquity {
  return {
    status: "CLOSED_WIN",
    direction: "BUY",
    entry: 100,
    stopLoss: 90,
    takeProfit: 120,
    ...overrides,
  };
}

describe("signalR", () => {
  it("loss is -1R regardless of RR", () => {
    expect(
      signalR(sig({ status: "CLOSED_LOSS", closedAt: new Date() })),
    ).toBe(-1);
  });

  it("win uses entry→TP RR (BUY: risk 10, reward 20 → 2R)", () => {
    expect(signalR(sig({ closedAt: new Date() }))).toBe(2);
  });

  it("win with SELL direction", () => {
    expect(
      signalR(
        sig({
          direction: "SELL",
          entry: 100,
          stopLoss: 105,
          takeProfit: 90,
          closedAt: new Date(),
        }),
      ),
    ).toBe(2);
  });

  it("win without SL/TP falls back to +1R", () => {
    expect(
      signalR(sig({ stopLoss: null, takeProfit: null, closedAt: new Date() })),
    ).toBe(1);
  });

  it("win with invalid RR geometry falls back to +1R", () => {
    // SL above entry on a BUY → calcRR returns null
    expect(
      signalR(sig({ stopLoss: 110, takeProfit: 120, closedAt: new Date() })),
    ).toBe(1);
  });
});

describe("buildEquityCurve", () => {
  it("sorts by closedAt and accumulates R", () => {
    const points = buildEquityCurve([
      sig({ status: "CLOSED_LOSS", closedAt: new Date("2026-02-01") }),
      sig({ closedAt: new Date("2026-01-01") }),
    ]);
    expect(points.map((p) => p.r)).toEqual([2, -1]);
    expect(points.map((p) => p.cumR)).toEqual([2, 1]);
    expect(points[0].date.getTime()).toBeLessThan(points[1].date.getTime());
  });

  it("empty input gives empty curve", () => {
    expect(buildEquityCurve([])).toEqual([]);
  });
});

describe("buildMonthlyR", () => {
  it("buckets by month and fills gaps with 0, across year boundary", () => {
    const months = buildMonthlyR([
      sig({ closedAt: new Date("2025-11-15") }),
      sig({ status: "CLOSED_LOSS", closedAt: new Date("2026-01-10") }),
      sig({ status: "CLOSED_LOSS", closedAt: new Date("2026-01-20") }),
    ]);
    expect(months.map((m) => m.key)).toEqual(["2025-11", "2025-12", "2026-01"]);
    expect(months[0]).toMatchObject({ r: 2, wins: 1, losses: 0 });
    expect(months[1]).toMatchObject({ r: 0, wins: 0, losses: 0 });
    expect(months[2]).toMatchObject({ r: -2, wins: 0, losses: 2 });
  });

  it("month arithmetic does not overflow on day 29-31 closes", () => {
    const months = buildMonthlyR([
      sig({ closedAt: new Date("2026-01-31T12:00:00Z") }),
      sig({ closedAt: new Date("2026-03-31T12:00:00Z") }),
    ]);
    expect(months.map((m) => m.key)).toEqual(["2026-01", "2026-02", "2026-03"]);
  });

  it("empty input gives empty list", () => {
    expect(buildMonthlyR([])).toEqual([]);
  });
});
