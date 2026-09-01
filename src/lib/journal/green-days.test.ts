import { describe, expect, it } from "vitest";
import { computeGreenDays, type GreenPlanDay, type GreenTrade } from "./green-days";

let seq = 0;

function trade(day: string, overrides: Partial<GreenTrade> = {}): GreenTrade {
  seq += 1;
  const opened = new Date(`${day}T08:00:00.000Z`).getTime() + seq * 60_000;
  const iso = new Date(opened).toISOString();
  return {
    symbol: "XAUUSD",
    direction: "LONG",
    entry: 100,
    stopLoss: 99,
    exitPrice: 101,
    result: "WIN",
    pnl: 10,
    lotSize: 0.1,
    openedAt: iso,
    closedAt: iso,
    emotion: null,
    setup: null,
    mistakes: [],
    overrodeDailyLimit: false,
    overrodeLossStreakGuard: false,
    ...overrides,
  };
}

function fullPlan(day: string, maxTrades: number | null = 3): GreenPlanDay {
  return {
    planDate: `${day}T00:00:00.000Z`,
    maxTrades,
    checkedNews: true,
    checkedLevels: true,
    checkedRisk: true,
    checkedEmotion: true,
    checkedJournal: true,
  };
}

describe("computeGreenDays", () => {
  it("returns nothing for an empty history", () => {
    const res = computeGreenDays([]);
    expect(res.greenDays).toEqual([]);
    expect(res.tradingDays).toBe(0);
    expect(res.common.symbol).toBeNull();
  });

  it("flags a clean day: checklist + within limit + all SL (3 signals)", () => {
    const res = computeGreenDays(
      [
        trade("2026-08-10", { result: "WIN", pnl: 20 }),
        trade("2026-08-10", { result: "LOSS", pnl: -10 }),
      ],
      [fullPlan("2026-08-10")],
    );
    expect(res.greenDays).toHaveLength(1);
    expect(res.greenDays[0].signals).toEqual(
      expect.arrayContaining(["checklistDone", "withinLimit", "allHaveStop", "noMistakes"]),
    );
  });

  it("a self-tagged mistake disqualifies the day even with many signals", () => {
    const res = computeGreenDays(
      [
        trade("2026-08-10", { result: "WIN", pnl: 20, exitPrice: 103 }), // +3R
        trade("2026-08-10", { mistakes: ["CHASED"], result: "WIN", pnl: 20, exitPrice: 103 }),
      ],
      [fullPlan("2026-08-10")],
    );
    expect(res.greenDays).toEqual([]);
  });

  it("a guard override disqualifies the day", () => {
    const res = computeGreenDays(
      [
        trade("2026-08-10", { result: "WIN", pnl: 20, exitPrice: 103 }),
        trade("2026-08-10", { overrodeDailyLimit: true, result: "WIN", pnl: 20, exitPrice: 103 }),
      ],
      [fullPlan("2026-08-10")],
    );
    expect(res.greenDays).toEqual([]);
  });

  it("needs at least GREEN_SIGNAL_MIN signals", () => {
    // No plan, 5 trades (> DISCIPLINED_MAX_TRADES) one without SL → only noMistakes fires
    const res = computeGreenDays([
      trade("2026-08-10", { stopLoss: null, exitPrice: null, result: "WIN", pnl: 5 }),
      trade("2026-08-10", { result: "WIN", pnl: 5 }),
      trade("2026-08-10", { result: "WIN", pnl: 5 }),
      trade("2026-08-10", { result: "WIN", pnl: 5 }),
      trade("2026-08-10", { result: "WIN", pnl: 5 }),
    ]);
    expect(res.greenDays).toEqual([]);
  });

  it("scores steadyMood from a good check-in and calm emotions", () => {
    const res = computeGreenDays(
      [
        trade("2026-08-10", { result: "WIN", pnl: 10, emotion: "CALM" }),
        trade("2026-08-10", { result: "WIN", pnl: 10, emotion: "CONFIDENT" }),
      ],
      [fullPlan("2026-08-10")],
      [{ day: "2026-08-10T00:00:00.000Z", mood: "good" }],
    );
    expect(res.greenDays[0].signals).toContain("steadyMood");

    const revenge = computeGreenDays(
      [trade("2026-08-11", { result: "WIN", pnl: 10, emotion: "REVENGE" })],
      [fullPlan("2026-08-11")],
      [{ day: "2026-08-11T00:00:00.000Z", mood: "good" }],
    );
    expect(revenge.greenDays[0]?.signals ?? []).not.toContain("steadyMood");
  });

  it("scores hitTarget and onPlaybook", () => {
    const res = computeGreenDays(
      [
        trade("2026-08-10", { result: "WIN", pnl: 30, exitPrice: 103, setup: "PULLBACK" }), // +3R
        trade("2026-08-10", { result: "WIN", pnl: 10, exitPrice: 101, setup: "PULLBACK" }),
      ],
      [fullPlan("2026-08-10")],
      [],
      "PULLBACK",
    );
    expect(res.greenDays[0].signals).toEqual(
      expect.arrayContaining(["hitTarget", "onPlaybook"]),
    );
  });

  it("splits P/L and win rate, sorts best first, and builds the portrait", () => {
    const res = computeGreenDays(
      [
        // green day A: 3 signals, net +40
        trade("2026-08-10", { result: "WIN", pnl: 20, setup: "TREND" }),
        trade("2026-08-10", { result: "WIN", pnl: 20, setup: "TREND" }),
        // green day B: 3 signals, net +10
        trade("2026-08-12", { result: "WIN", pnl: 10, setup: "TREND" }),
        trade("2026-08-12", { result: "LOSS", pnl: 0, exitPrice: 100, setup: "TREND" }),
        // non-green day: guard override
        trade("2026-08-13", { result: "LOSS", pnl: -50, overrodeLossStreakGuard: true }),
      ],
      [fullPlan("2026-08-10"), fullPlan("2026-08-12")],
    );
    expect(res.greenDays.map((d) => d.day)).toEqual(["2026-08-10", "2026-08-12"]);
    expect(res.greenNetPnl).toBe(50);
    expect(res.otherNetPnl).toBe(-50);
    expect(res.common.symbol).toBe("XAUUSD");
    expect(res.common.setup).toBe("TREND");
    expect(res.common.avgTradeCount).toBe(2);
  });
});
