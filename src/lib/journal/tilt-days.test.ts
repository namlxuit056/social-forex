import { describe, expect, it } from "vitest";
import { computeTiltDays, type TiltTrade } from "./tilt-days";

let seq = 0;

function trade(day: string, overrides: Partial<TiltTrade> = {}): TiltTrade {
  seq += 1;
  // Strictly increasing timestamp so intra-day order is deterministic.
  const opened = new Date(`${day}T08:00:00.000Z`).getTime() + seq * 60_000;
  const openedIso = new Date(opened).toISOString();
  return {
    symbol: "XAUUSD",
    direction: "LONG",
    entry: 100,
    stopLoss: 99,
    exitPrice: 98,
    result: "LOSS",
    pnl: -10,
    lotSize: 0.1,
    openedAt: openedIso,
    closedAt: openedIso,
    emotion: null,
    mistakes: [],
    overrodeDailyLimit: false,
    overrodeLossStreakGuard: false,
    ...overrides,
  };
}

describe("computeTiltDays", () => {
  it("returns nothing for an empty / calm history", () => {
    const res = computeTiltDays([
      trade("2026-08-10", { result: "WIN", pnl: 20, exitPrice: 103 }),
      trade("2026-08-11", { result: "LOSS", pnl: -10 }),
    ]);
    expect(res.tiltDays).toEqual([]);
    expect(res.tradingDays).toBe(2);
  });

  it("needs at least TILT_SIGNAL_MIN signals to flag a day", () => {
    // 4 straight but tiny losses = lossStreak signal only (R barely negative) → not flagged
    const small = { stopLoss: 90, exitPrice: 99.5, pnl: -2 } as const;
    const res = computeTiltDays([
      trade("2026-08-10", { result: "LOSS", ...small }),
      trade("2026-08-10", { result: "LOSS", ...small }),
      trade("2026-08-10", { result: "LOSS", ...small }),
      trade("2026-08-10", { result: "LOSS", ...small }),
    ]);
    expect(res.tiltDays).toEqual([]);
  });

  it("flags a day with loss streak + deep R loss", () => {
    const res = computeTiltDays([
      trade("2026-08-10", { result: "LOSS", exitPrice: 98 }), // -2R
      trade("2026-08-10", { result: "LOSS", exitPrice: 98 }),
      trade("2026-08-10", { result: "LOSS", exitPrice: 98 }),
    ]);
    expect(res.tiltDays).toHaveLength(1);
    expect(res.tiltDays[0].signals).toEqual(
      expect.arrayContaining(["lossStreak", "deepLoss"]),
    );
    expect(res.tiltDays[0].lossStreak).toBe(3);
  });

  it("detects position-size escalation after a loss", () => {
    const res = computeTiltDays([
      trade("2026-08-10", { result: "LOSS", lotSize: 0.1 }),
      trade("2026-08-10", { result: "LOSS", lotSize: 0.3 }), // bigger after a loss
      trade("2026-08-10", { result: "WIN", lotSize: 0.3, pnl: 5, exitPrice: 101 }),
      trade("2026-08-10", { result: "LOSS", lotSize: 0.5 }),
      trade("2026-08-10", { result: "WIN", lotSize: 0.5, pnl: 5, exitPrice: 101 }),
      trade("2026-08-10", { result: "LOSS", lotSize: 0.9 }),
    ]);
    const d = res.tiltDays[0];
    expect(d.signals).toEqual(expect.arrayContaining(["sizeEscalation", "overtrading"]));
  });

  it("flags overtrading by absolute count and relative to the day's plan", () => {
    const sixLosers = Array.from({ length: 6 }, () =>
      trade("2026-08-10", { result: "WIN", pnl: 2, exitPrice: 101 }),
    );
    const abs = computeTiltDays(sixLosers);
    // 6 wins → overtrading fires but that's the only signal → not flagged
    expect(abs.tiltDays).toEqual([]);

    const rel = computeTiltDays(
      [
        trade("2026-08-11", { result: "WIN", pnl: 2, exitPrice: 101 }),
        trade("2026-08-11", { result: "WIN", pnl: 2, exitPrice: 101 }),
        trade("2026-08-11", { result: "WIN", pnl: 2, exitPrice: 101 }),
        trade("2026-08-11", { result: "LOSS", overrodeDailyLimit: true }),
      ],
      [{ planDate: "2026-08-11T00:00:00.000Z", maxTrades: 2 }],
    );
    // 4 trades vs plan max 2 (>= +2) → overtrading; plus guardOverride → flagged
    expect(rel.tiltDays).toHaveLength(1);
    expect(rel.tiltDays[0].signals).toEqual(
      expect.arrayContaining(["overtrading", "guardOverride"]),
    );
  });

  it("flags revenge from an emotion tag or a mistake tag", () => {
    const res = computeTiltDays([
      trade("2026-08-10", { result: "LOSS", emotion: "REVENGE" }),
      trade("2026-08-10", { result: "LOSS", mistakes: ["CHASED"] }),
      trade("2026-08-10", { result: "LOSS" }),
    ]);
    expect(res.tiltDays[0].signals).toEqual(
      expect.arrayContaining(["revenge", "lossStreak"]),
    );
  });

  it("sorts tilt days by signal count then by net P/L ascending", () => {
    const res = computeTiltDays([
      // day A: lossStreak + revenge (2 signals), net -30
      trade("2026-08-10", { result: "LOSS", pnl: -10, emotion: "REVENGE" }),
      trade("2026-08-10", { result: "LOSS", pnl: -10 }),
      trade("2026-08-10", { result: "LOSS", pnl: -10 }),
      // day B: lossStreak + revenge + guardOverride (3 signals), net -20
      trade("2026-08-12", { result: "LOSS", pnl: -5, emotion: "REVENGE" }),
      trade("2026-08-12", { result: "LOSS", pnl: -5, overrodeLossStreakGuard: true }),
      trade("2026-08-12", { result: "LOSS", pnl: -10 }),
    ]);
    expect(res.tiltDays.map((d) => d.day)).toEqual(["2026-08-12", "2026-08-10"]);
  });

  it("splits P/L and win rate between tilt and normal days", () => {
    const res = computeTiltDays([
      // tilt day: 3 losses + revenge
      trade("2026-08-10", { result: "LOSS", pnl: -40, emotion: "REVENGE" }),
      trade("2026-08-10", { result: "LOSS", pnl: -40 }),
      trade("2026-08-10", { result: "LOSS", pnl: -40 }),
      // normal days
      trade("2026-08-11", { result: "WIN", pnl: 30, exitPrice: 103 }),
      trade("2026-08-12", { result: "WIN", pnl: 30, exitPrice: 103 }),
      trade("2026-08-13", { result: "LOSS", pnl: -10 }),
    ]);
    expect(res.tiltNetPnl).toBe(-120);
    expect(res.normalNetPnl).toBe(50);
    expect(res.tiltWinRate).toBe(0);
    expect(res.normalWinRate).toBeCloseTo(66.7, 1);
  });
});
