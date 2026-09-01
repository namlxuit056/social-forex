import { describe, expect, it } from "vitest";
import { computeMistakeStats, type MistakeStatTrade } from "./mistake-stats";

function trade(overrides: Partial<MistakeStatTrade> = {}): MistakeStatTrade {
  return { result: "LOSS", pnl: -10, mistakes: [], ...overrides };
}

describe("computeMistakeStats", () => {
  it("returns empty rows and null win rates for no trades", () => {
    const res = computeMistakeStats([]);
    expect(res.rows).toEqual([]);
    expect(res.taggedTrades).toBe(0);
    expect(res.untaggedClosed).toBe(0);
    expect(res.withMistakeWinRate).toBeNull();
    expect(res.withoutMistakeWinRate).toBeNull();
  });

  it("ignores pending trades", () => {
    const res = computeMistakeStats([
      trade({ result: "PENDING", mistakes: ["NO_STOP"] }),
    ]);
    expect(res.rows).toEqual([]);
    expect(res.taggedTrades).toBe(0);
  });

  it("ranks tags by total P/L ascending (most expensive first)", () => {
    const res = computeMistakeStats([
      trade({ mistakes: ["MOVED_STOP"], pnl: -200 }),
      trade({ mistakes: ["MOVED_STOP"], pnl: -220 }),
      trade({ mistakes: ["CHASED"], pnl: -50 }),
      trade({ mistakes: ["NEWS"], pnl: 30, result: "WIN" }),
    ]);
    expect(res.rows.map((r) => r.tag)).toEqual(["MOVED_STOP", "CHASED", "NEWS"]);
    expect(res.rows[0].totalPnl).toBe(-420);
    expect(res.rows[0].avgPnl).toBe(-210);
    expect(res.rows[0].count).toBe(2);
  });

  it("tie-breaks equal total P/L by count desc", () => {
    const res = computeMistakeStats([
      trade({ mistakes: ["CHASED"], pnl: -30 }),
      trade({ mistakes: ["CHASED"], pnl: -30 }),
      trade({ mistakes: ["REVENGE"], pnl: -60 }),
    ]);
    expect(res.rows.map((r) => r.tag)).toEqual(["CHASED", "REVENGE"]);
  });

  it("counts a trade once per tag even if the tag is repeated", () => {
    const res = computeMistakeStats([
      trade({ mistakes: ["NO_STOP", "NO_STOP"], pnl: -40 }),
    ]);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].count).toBe(1);
  });

  it("computes win rate per tag only with >= 2 W/L trades", () => {
    const res = computeMistakeStats([
      trade({ mistakes: ["OVERSIZED"], result: "WIN", pnl: 10 }),
      trade({ mistakes: ["OVERSIZED"], result: "LOSS", pnl: -10 }),
      trade({ mistakes: ["EARLY_ENTRY"], result: "LOSS", pnl: -10 }),
    ]);
    const oversized = res.rows.find((r) => r.tag === "OVERSIZED")!;
    const early = res.rows.find((r) => r.tag === "EARLY_ENTRY")!;
    expect(oversized.winRate).toBe(50);
    expect(early.winRate).toBeNull();
  });

  it("compares win rate with vs without a mistake tag", () => {
    const res = computeMistakeStats([
      trade({ mistakes: ["CHASED"], result: "LOSS", pnl: -10 }),
      trade({ mistakes: ["CHASED"], result: "LOSS", pnl: -10 }),
      trade({ mistakes: ["CHASED"], result: "WIN", pnl: 10 }),
      trade({ mistakes: [], result: "WIN", pnl: 20 }),
      trade({ mistakes: [], result: "WIN", pnl: 20 }),
      trade({ mistakes: [], result: "LOSS", pnl: -5 }),
    ]);
    expect(res.taggedTrades).toBe(3);
    expect(res.untaggedClosed).toBe(3);
    expect(res.withMistakeWinRate).toBeCloseTo(33.3, 1);
    expect(res.withoutMistakeWinRate).toBeCloseTo(66.7, 1);
  });

  it("skips pnl-less trades from totalPnl but still counts them", () => {
    const res = computeMistakeStats([
      trade({ mistakes: ["HELD_LOSER"], pnl: null, result: "LOSS" }),
      trade({ mistakes: ["HELD_LOSER"], pnl: -80, result: "LOSS" }),
    ]);
    const held = res.rows[0];
    expect(held.count).toBe(2);
    expect(held.totalPnl).toBe(-80);
    expect(held.avgPnl).toBe(-80);
  });
});
