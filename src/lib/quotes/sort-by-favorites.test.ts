import { describe, it, expect } from "vitest";
import { sortQuoteRowsByFavorites } from "./sort-by-favorites";
import type { QuoteRow } from "./types";

const row = (symbol: string, group: QuoteRow["group"] = "major"): QuoteRow => ({
  symbol,
  name: symbol,
  group,
  bid: 1,
  ask: 1,
  changePct: 0,
});

describe("sortQuoteRowsByFavorites", () => {
  it("pins favorites first in favorites order", () => {
    const rows = [row("GBPUSD"), row("EURUSD"), row("USDJPY")];
    const sorted = sortQuoteRowsByFavorites(rows, ["USDJPY", "EURUSD"]);
    expect(sorted.map((r) => r.symbol)).toEqual([
      "USDJPY",
      "EURUSD",
      "GBPUSD",
    ]);
  });
});
