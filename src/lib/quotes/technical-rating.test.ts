import { describe, expect, it } from "vitest";
import {
  classifyRating,
  computeConfidentSignal,
  computePriceLevels,
  TV_TICKER_MAP,
  type SymbolScores,
} from "./technical-rating";
import { QUOTE_DEFINITIONS } from "./definitions";

function scores(overrides: Partial<SymbolScores>): SymbolScores {
  return {
    score4h: 0,
    score1d: 0,
    close: 1.1,
    atr4h: 0.001,
    ema20_4h: 1.1,
    ...overrides,
  };
}

describe("classifyRating", () => {
  it("classifies strong buy/sell at the +-0.5 boundary", () => {
    expect(classifyRating(0.5)).toBe("strong_buy");
    expect(classifyRating(0.6)).toBe("strong_buy");
    expect(classifyRating(-0.5)).toBe("strong_sell");
    expect(classifyRating(-0.6)).toBe("strong_sell");
  });

  it("classifies buy/sell at the +-0.1 boundary", () => {
    expect(classifyRating(0.1)).toBe("buy");
    expect(classifyRating(0.49)).toBe("buy");
    expect(classifyRating(-0.1)).toBe("sell");
    expect(classifyRating(-0.49)).toBe("sell");
  });

  it("classifies neutral strictly between -0.1 and 0.1", () => {
    expect(classifyRating(0)).toBe("neutral");
    expect(classifyRating(0.09)).toBe("neutral");
    expect(classifyRating(-0.09)).toBe("neutral");
  });
});

describe("computeConfidentSignal", () => {
  it("returns buy when 4H is strong buy and 1D agrees (positive)", () => {
    expect(computeConfidentSignal(scores({ score4h: 0.56, score1d: 0.2 }))).toBe("buy");
  });

  it("returns sell when 4H is strong sell and 1D agrees (negative)", () => {
    expect(computeConfidentSignal(scores({ score4h: -0.56, score1d: -0.2 }))).toBe("sell");
  });

  it("returns null when 4H is strong buy but 1D disagrees (negative)", () => {
    expect(computeConfidentSignal(scores({ score4h: 0.56, score1d: -0.1 }))).toBeNull();
  });

  it("returns null when 4H is strong sell but 1D disagrees (positive)", () => {
    expect(computeConfidentSignal(scores({ score4h: -0.56, score1d: 0.1 }))).toBeNull();
  });

  it("returns null when 4H is only buy/sell, not strong", () => {
    expect(computeConfidentSignal(scores({ score4h: 0.3, score1d: 0.3 }))).toBeNull();
    expect(computeConfidentSignal(scores({ score4h: -0.3, score1d: -0.3 }))).toBeNull();
  });

  it("returns null when 1D is exactly zero (no confirmation either way)", () => {
    expect(computeConfidentSignal(scores({ score4h: 0.6, score1d: 0 }))).toBeNull();
    expect(computeConfidentSignal(scores({ score4h: -0.6, score1d: 0 }))).toBeNull();
  });
});

describe("computePriceLevels", () => {
  it("buy: entry brackets EMA20, SL below by 1x ATR, TP above by 2x ATR", () => {
    const levels = computePriceLevels(
      "buy",
      scores({ ema20_4h: 1.1, atr4h: 0.01, close: 1.105 }),
    );
    expect(levels.entryLow).toBeCloseTo(1.095, 4);
    expect(levels.entryHigh).toBeCloseTo(1.105, 4);
    expect(levels.stopLoss).toBeCloseTo(1.09, 4);
    expect(levels.takeProfit).toBeCloseTo(1.12, 4);
  });

  it("sell: SL above EMA20 by 1x ATR, TP below by 2x ATR", () => {
    const levels = computePriceLevels(
      "sell",
      scores({ ema20_4h: 1.1, atr4h: 0.01, close: 1.095 }),
    );
    expect(levels.stopLoss).toBeCloseTo(1.11, 4);
    expect(levels.takeProfit).toBeCloseTo(1.08, 4);
  });

  it("rounds to fewer decimals for larger-magnitude prices (JPY/gold/crypto-like)", () => {
    const levels = computePriceLevels(
      "buy",
      scores({ ema20_4h: 79500.123456, atr4h: 2000.456, close: 79500 }),
    );
    // close >= 1000 -> 1 decimal
    expect(levels.entryLow.toString().split(".")[1]?.length ?? 0).toBeLessThanOrEqual(1);
  });
});

describe("TV_TICKER_MAP", () => {
  it("covers every app quote symbol with a market + ticker", () => {
    for (const def of QUOTE_DEFINITIONS) {
      expect(TV_TICKER_MAP[def.symbol], `missing mapping for ${def.symbol}`).toBeDefined();
    }
  });
});
