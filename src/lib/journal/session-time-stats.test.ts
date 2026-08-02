import { describe, expect, it } from "vitest";
import { computeSessionStats, computeTimeWindowStats, type SessionTimeTrade } from "./session-time-stats";

function trade(hourUtc: number, overrides: Partial<SessionTimeTrade> = {}): SessionTimeTrade {
  const openedAt = `2026-01-01T${String(hourUtc).padStart(2, "0")}:00:00.000Z`;
  return {
    direction: "LONG",
    entry: 1.1,
    stopLoss: 1.095,
    exitPrice: 1.11,
    result: "WIN",
    pnl: 100,
    openedAt,
    ...overrides,
  };
}

describe("computeSessionStats", () => {
  it("groups trades into asia/london/newyork by UTC hour", () => {
    const stats = computeSessionStats([
      trade(2), // asia
      trade(9), // london
      trade(15), // newyork
    ]);
    expect(stats.asia?.total).toBe(1);
    expect(stats.london?.total).toBe(1);
    expect(stats.newyork?.total).toBe(1);
  });

  it("returns null for sessions with no closed trades", () => {
    const stats = computeSessionStats([trade(2)]);
    expect(stats.london).toBeNull();
  });

  it("computes avgR and expectancy per session", () => {
    const stats = computeSessionStats([
      trade(2, { pnl: 100, exitPrice: 1.11 }), // R = 2
      trade(3, { pnl: -50, result: "LOSS", exitPrice: 1.095 }), // R = -1
    ]);
    expect(stats.asia?.total).toBe(2);
    expect(stats.asia?.avgR).toBe(0.5);
    expect(stats.asia?.expectancy).toBe(25);
  });
});

describe("computeTimeWindowStats", () => {
  it("buckets by 4h UTC windows and sorts by key", () => {
    const rows = computeTimeWindowStats([trade(21), trade(1), trade(9)]);
    expect(rows.map((r) => r.key)).toEqual(["00-04", "08-12", "20-24"]);
  });
});
