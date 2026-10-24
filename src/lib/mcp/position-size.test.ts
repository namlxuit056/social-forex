import { describe, expect, it } from "vitest";
import { computePositionSize, quoteKind } from "./position-size";

describe("quoteKind", () => {
  it("detects the quote currency", () => {
    expect(quoteKind("eurusd")).toBe("USD");
    expect(quoteKind("USDJPY")).toBe("JPY");
    expect(quoteKind("EURGBP")).toBe("other");
  });
});

describe("computePositionSize", () => {
  it("EURUSD: 1% of 10k with a 50-pip stop is 0.2 lots", () => {
    const r = computePositionSize({ symbol: "EURUSD", balance: 10_000, riskPct: 1, entry: 1.1, stopLoss: 1.095 });
    expect(r.stopLossPips).toBe(50);
    expect(r.riskAmount).toBe(100);
    expect(r.lots).toBe(0.2);
    expect(r.notes).toEqual([]);
  });

  it("XAUUSD uses 0.1 pip and 100 oz contracts", () => {
    const r = computePositionSize({ symbol: "XAUUSD", balance: 5_000, riskPct: 2, entry: 2650, stopLoss: 2640 });
    expect(r.stopLossPips).toBe(100);
    expect(r.lots).toBe(0.1);
  });

  it("adds margin when leverage is given; USD-base pairs use contract value in USD", () => {
    const r = computePositionSize({ symbol: "USDJPY", balance: 10_000, riskPct: 1, entry: 150, stopLoss: 149.5, leverage: 100 });
    expect(r.lots).toBeGreaterThan(0);
    expect(r.marginRequired).toBe(Number(((100_000 * r.lots) / 100).toFixed(2)));
  });

  it("flags approximations and zero stops", () => {
    expect(computePositionSize({ symbol: "EURGBP", balance: 1000, riskPct: 1, entry: 0.85, stopLoss: 0.84 }).notes).toHaveLength(1);
    const zero = computePositionSize({ symbol: "EURUSD", balance: 1000, riskPct: 1, entry: 1.1, stopLoss: 1.1 });
    expect(zero.lots).toBe(0);
    expect(zero.marginRequired).toBeNull();
  });
});
