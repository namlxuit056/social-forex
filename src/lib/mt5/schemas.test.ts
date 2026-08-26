import { describe, expect, it } from "vitest";
import { parseMt5TicketSets } from "./schemas";

describe("parseMt5TicketSets", () => {
  it("collects open position tickets (preferring identifier over ticket) and pending order tickets", () => {
    const lastPositions = [
      { ticket: "111", identifier: "999", symbol: "EURUSD", type: "BUY", volume: 0.1, priceOpen: 1.1 },
      { ticket: "222", symbol: "GBPUSD", type: "SELL", volume: 0.1, priceOpen: 1.3 },
    ];
    const lastOrders = [
      { ticket: "333", symbol: "USDJPY", type: "BUY_LIMIT", volume: 0.1, priceOpen: 150 },
    ];

    const { activeMt5Tickets, pendingMt5Tickets } = parseMt5TicketSets(lastPositions, lastOrders);

    expect(activeMt5Tickets).toEqual(new Set(["999", "222"]));
    expect(pendingMt5Tickets).toEqual(new Set(["333"]));
  });

  it("returns empty sets for null/invalid input instead of throwing", () => {
    expect(parseMt5TicketSets(null, undefined)).toEqual({
      activeMt5Tickets: new Set(),
      pendingMt5Tickets: new Set(),
    });
    expect(parseMt5TicketSets("not an array", { garbage: true })).toEqual({
      activeMt5Tickets: new Set(),
      pendingMt5Tickets: new Set(),
    });
  });
});
