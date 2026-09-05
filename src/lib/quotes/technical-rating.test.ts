import { describe, expect, it } from "vitest";
import { classifyRating, computeConfidentSignal, TV_TICKER_MAP } from "./technical-rating";
import { QUOTE_DEFINITIONS } from "./definitions";

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
    expect(computeConfidentSignal({ score4h: 0.56, score1d: 0.2 })).toBe("buy");
  });

  it("returns sell when 4H is strong sell and 1D agrees (negative)", () => {
    expect(computeConfidentSignal({ score4h: -0.56, score1d: -0.2 })).toBe("sell");
  });

  it("returns null when 4H is strong buy but 1D disagrees (negative)", () => {
    expect(computeConfidentSignal({ score4h: 0.56, score1d: -0.1 })).toBeNull();
  });

  it("returns null when 4H is strong sell but 1D disagrees (positive)", () => {
    expect(computeConfidentSignal({ score4h: -0.56, score1d: 0.1 })).toBeNull();
  });

  it("returns null when 4H is only buy/sell, not strong", () => {
    expect(computeConfidentSignal({ score4h: 0.3, score1d: 0.3 })).toBeNull();
    expect(computeConfidentSignal({ score4h: -0.3, score1d: -0.3 })).toBeNull();
  });

  it("returns null when 1D is exactly zero (no confirmation either way)", () => {
    expect(computeConfidentSignal({ score4h: 0.6, score1d: 0 })).toBeNull();
    expect(computeConfidentSignal({ score4h: -0.6, score1d: 0 })).toBeNull();
  });
});

describe("TV_TICKER_MAP", () => {
  it("covers every app quote symbol with a market + ticker", () => {
    for (const def of QUOTE_DEFINITIONS) {
      expect(TV_TICKER_MAP[def.symbol], `missing mapping for ${def.symbol}`).toBeDefined();
    }
  });
});
