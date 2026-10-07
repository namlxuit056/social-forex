import { describe, expect, it } from "vitest";
import { marketOrderTypeForSignal, pendingOrderTypeForSignal } from "./signal-order-type";

const quote = { bid: 4166.2, ask: 4166.44 };

describe("pendingOrderTypeForSignal", () => {
  it("uses limit when entry is a pullback from the current price", () => {
    expect(pendingOrderTypeForSignal("SHORT", 4179.5, quote)).toBe("SELL_LIMIT");
    expect(pendingOrderTypeForSignal("LONG", 4150, quote)).toBe("BUY_LIMIT");
  });

  it("uses stop when entry is a breakout beyond the current price", () => {
    expect(pendingOrderTypeForSignal("SHORT", 4150, quote)).toBe("SELL_STOP");
    expect(pendingOrderTypeForSignal("LONG", 4180, quote)).toBe("BUY_STOP");
  });

  it("returns null without a quote, at market, or for unknown direction", () => {
    expect(pendingOrderTypeForSignal("LONG", 4180, null)).toBeNull();
    expect(pendingOrderTypeForSignal("LONG", quote.ask, quote)).toBeNull();
    expect(pendingOrderTypeForSignal("FLAT", 4180, quote)).toBeNull();
  });
});

describe("marketOrderTypeForSignal", () => {
  it("maps direction to market order", () => {
    expect(marketOrderTypeForSignal("LONG")).toBe("BUY");
    expect(marketOrderTypeForSignal("SHORT")).toBe("SELL");
    expect(marketOrderTypeForSignal("X")).toBeNull();
  });
});
