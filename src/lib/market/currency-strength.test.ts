import { describe, expect, it } from "vitest";
import { buildStrengthMatrix, currencyStrengthScores } from "./currency-strength";

describe("currencyStrengthScores", () => {
  it("inverts the sign for pairs quoted the other way", () => {
    const s = currencyStrengthScores([
      { symbol: "EURUSD", changePct: 1 },
      { symbol: "USDJPY", changePct: 0.5 },
    ]);
    expect(s.get("EUR")).toBe(1);
    expect(s.get("JPY")).toBe(-0.5);
    expect(s.get("USD")).toBe(-0.25); // (-1 + 0.5) / 2
    expect(s.get("CHF")).toBe(0);
  });
});

describe("buildStrengthMatrix", () => {
  it("is 8×8 with null diagonal and values in 0..1", () => {
    const m = buildStrengthMatrix([{ symbol: "EURUSD", changePct: 0.02 }]);
    expect(m).toHaveLength(8);
    m.forEach((row, i) => {
      expect(row.values[i]).toBeNull();
      row.values.forEach((v) => v !== null && expect(v).toBeGreaterThanOrEqual(0));
    });
    const eur = m.find((r) => r.base === "EUR")!;
    // EUR = +0.02, USD = -0.02 → 0.5 + 0.04 * 5 = 0.7
    expect(eur.values[0]).toBe(0.7);
    expect(m.find((r) => r.base === "USD")!.values[1]).toBe(0.3);
  });
});
