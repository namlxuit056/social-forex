import { describe, expect, it } from "vitest";
import {
  computeEdgeCheck,
  edgeFacetLabelEn,
  normalizeDirection,
  type EdgeCheckTrade,
} from "./edge-check";

// 2026-09-28 là thứ Hai; 09:00 UTC = phiên Âu, 02:00 UTC = phiên Á.
const LONDON_MONDAY = "2026-09-28T09:00:00.000Z";
const ASIA_TUESDAY = "2026-09-29T02:00:00.000Z";

function make(
  count: number,
  wins: number,
  over: Partial<EdgeCheckTrade> = {},
): EdgeCheckTrade[] {
  return Array.from({ length: count }, (_, i) => ({
    symbol: "EURUSD",
    direction: "LONG",
    result: i < wins ? "WIN" : "LOSS",
    openedAt: LONDON_MONDAY,
    ...over,
  }));
}

describe("normalizeDirection", () => {
  it("maps MT5 order types and journal directions onto LONG/SHORT", () => {
    expect(normalizeDirection("BUY_LIMIT")).toBe("LONG");
    expect(normalizeDirection("sell")).toBe("SHORT");
    expect(normalizeDirection("LONG")).toBe("LONG");
    expect(normalizeDirection("")).toBeNull();
  });
});

describe("computeEdgeCheck", () => {
  it("returns null until there are enough decided trades for a baseline", () => {
    expect(computeEdgeCheck(make(9, 5), { symbol: "EURUSD", direction: "LONG" })).toBeNull();
  });

  it("ignores breakeven and pending trades", () => {
    const trades = [...make(9, 5), ...make(5, 0, { result: "BREAKEVEN" })];
    expect(computeEdgeCheck(trades, { symbol: "EURUSD", direction: "LONG" })).toBeNull();
  });

  it("flags a weak symbol against the trader's own baseline", () => {
    // EURUSD 14/16 thắng, XAUUSD 1/6 thắng → mức chung 15/22 = 68.2%
    const trades = [...make(16, 14), ...make(6, 1, { symbol: "XAUUSD" })];
    const res = computeEdgeCheck(trades, { symbol: "xauusd", direction: "BUY" });
    expect(res?.baselineWinRate).toBe(68.2);
    expect(res?.verdict).toBe("weak");
    expect(res?.headline).toMatchObject({ key: "XAUUSD LONG", winRate: 16.7, total: 6 });
  });

  it("flags a strong context when nothing is weak", () => {
    const trades = [...make(16, 5), ...make(6, 6, { symbol: "XAUUSD" })];
    const res = computeEdgeCheck(trades, { symbol: "XAUUSD", direction: "LONG" });
    expect(res?.verdict).toBe("strong");
    expect(res?.headline?.winRate).toBe(100);
  });

  it("lets a weak facet win over a strong one", () => {
    // XAUUSD mạnh (6/6) nhưng SHORT yếu (1/8, toàn EURUSD)
    const trades = [
      ...make(10, 6),
      ...make(6, 6, { symbol: "XAUUSD" }),
      ...make(8, 1, { direction: "SHORT" }),
    ];
    const res = computeEdgeCheck(trades, { symbol: "XAUUSD", direction: "SELL" });
    expect(res?.verdict).toBe("weak");
    expect(res?.headline).toMatchObject({ dimension: "direction", key: "SHORT" });
  });

  it("stays neutral when the context is within the gap or under-sampled", () => {
    const trades = [...make(16, 8), ...make(4, 0, { symbol: "XAUUSD" })];
    const res = computeEdgeCheck(trades, { symbol: "XAUUSD", direction: "LONG" });
    expect(res?.verdict).toBe("neutral");
    expect(res?.headline).toBeNull();
    expect(res?.facets.some((f) => f.dimension === "symbol")).toBe(false);
  });

  it("only scores session and weekday when an entry time is given", () => {
    const trades = [...make(14, 12), ...make(6, 0, { openedAt: ASIA_TUESDAY })];
    const without = computeEdgeCheck(trades, { symbol: "EURUSD", direction: "LONG" });
    expect(without?.facets.map((f) => f.dimension)).toEqual([
      "symbolDirection",
      "symbol",
      "direction",
    ]);

    const withTime = computeEdgeCheck(trades, {
      symbol: "EURUSD",
      direction: "LONG",
      at: new Date(ASIA_TUESDAY),
    });
    expect(withTime?.verdict).toBe("weak");
    expect(withTime?.headline).toMatchObject({ dimension: "session", key: "asia", winRate: 0 });
    expect(withTime?.facets.find((f) => f.dimension === "weekday")?.key).toBe("2");
  });
});

describe("edgeFacetLabelEn", () => {
  it("names each dimension", () => {
    expect(edgeFacetLabelEn({ dimension: "session", key: "asia" })).toBe("the Asia session");
    expect(edgeFacetLabelEn({ dimension: "weekday", key: "1" })).toBe("Mondays");
    expect(edgeFacetLabelEn({ dimension: "direction", key: "SHORT" })).toBe("SHORT trades");
    expect(edgeFacetLabelEn({ dimension: "symbolDirection", key: "XAUUSD LONG" })).toBe("XAUUSD LONG");
  });
});
