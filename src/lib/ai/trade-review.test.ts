import { describe, expect, it } from "vitest";
import { buildTradeReviewContext, plannedRR, type TradeForReview } from "./trade-review";

function makeTrade(overrides: Partial<TradeForReview> = {}): TradeForReview {
  return {
    symbol: "XAUUSD",
    direction: "LONG",
    entry: 2000,
    stopLoss: 1990,
    takeProfit: 2030,
    exitPrice: 2030,
    lotSize: 0.1,
    result: "WIN",
    pnl: 300,
    notes: "Broke and retested the H4 demand zone, waited for the M15 confirmation candle.",
    setup: "breakout",
    emotion: "calm",
    openedAt: new Date("2026-08-27T08:00:00Z"),
    closedAt: new Date("2026-08-27T10:30:00Z"),
    overrodeDailyLimit: false,
    overrodeLossStreakGuard: false,
    ...overrides,
  };
}

describe("plannedRR", () => {
  it("computes reward:risk from entry/SL/TP", () => {
    expect(plannedRR({ direction: "LONG", entry: 2000, stopLoss: 1990, takeProfit: 2030 })).toBe(3);
  });

  it("returns null when SL or TP missing", () => {
    expect(plannedRR({ direction: "LONG", entry: 2000, stopLoss: null, takeProfit: 2030 })).toBeNull();
    expect(plannedRR({ direction: "LONG", entry: 2000, stopLoss: 1990, takeProfit: null })).toBeNull();
  });

  it("returns null when SL equals entry", () => {
    expect(plannedRR({ direction: "LONG", entry: 2000, stopLoss: 2000, takeProfit: 2030 })).toBeNull();
  });
});

describe("buildTradeReviewContext", () => {
  it("flags a missing stop loss", () => {
    const ctx = buildTradeReviewContext({
      trade: makeTrade({ stopLoss: null }),
      plan: null,
      bestSetup: null,
      priorLossStreak: 0,
    });
    expect(ctx.facts.some((f) => f.includes("No stop loss"))).toBe(true);
    expect(ctx.trade.hadStopLoss).toBe(false);
    expect(ctx.trade.realizedR).toBeNull();
  });

  it("computes realized R and planned RR for a clean trade", () => {
    const ctx = buildTradeReviewContext({
      trade: makeTrade(),
      plan: null,
      bestSetup: null,
      priorLossStreak: 0,
    });
    expect(ctx.trade.realizedR).toBe(3);
    expect(ctx.trade.plannedRR).toBe(3);
    expect(ctx.trade.holdMinutes).toBe(150);
  });

  it("flags guard overrides and a prior losing streak", () => {
    const ctx = buildTradeReviewContext({
      trade: makeTrade({ overrodeDailyLimit: true, overrodeLossStreakGuard: true }),
      plan: null,
      bestSetup: null,
      priorLossStreak: 3,
    });
    expect(ctx.facts.some((f) => f.includes("daily trade-limit"))).toBe(true);
    expect(ctx.facts.some((f) => f.includes("revenge-trading cooldown"))).toBe(true);
    expect(ctx.facts.some((f) => f.includes("losing streak of 3"))).toBe(true);
  });

  it("notes when the setup is not the trader's best setup", () => {
    const ctx = buildTradeReviewContext({
      trade: makeTrade({ setup: "reversal" }),
      plan: null,
      bestSetup: { setup: "breakout", winRate: 68, total: 20 },
      priorLossStreak: 0,
    });
    expect(ctx.facts.some((f) => f.includes('not the trader\'s best-performing setup'))).toBe(true);
  });

  it("flags trading against the day plan bias and an incomplete checklist", () => {
    const ctx = buildTradeReviewContext({
      trade: makeTrade({ direction: "LONG" }),
      plan: {
        maxTrades: 3,
        tradesLoggedThatDay: 5,
        bias: "BEARISH",
        keyLevels: null,
        newsToAvoid: "NFP at 12:30",
        checklistDone: 2,
        checklistTotal: 5,
      },
      bestSetup: null,
      priorLossStreak: 0,
    });
    expect(ctx.facts.some((f) => f.includes("contradicts the day plan's stated bias"))).toBe(true);
    expect(ctx.facts.some((f) => f.includes("capped trades at 3"))).toBe(true);
    expect(ctx.facts.some((f) => f.includes("checklist was only 2/5"))).toBe(true);
    expect(ctx.facts.some((f) => f.includes("news to avoid"))).toBe(true);
  });

  it("flags thin notes", () => {
    const ctx = buildTradeReviewContext({
      trade: makeTrade({ notes: "meh" }),
      plan: null,
      bestSetup: null,
      priorLossStreak: 0,
    });
    expect(ctx.facts.some((f) => f.includes("notes are missing or too thin"))).toBe(true);
  });
});
