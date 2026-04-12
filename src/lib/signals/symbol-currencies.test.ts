import { describe, it, expect } from "vitest";
import { symbolToCurrencies } from "./symbol-currencies";

describe("symbolToCurrencies", () => {
  it("maps major 6-letter pairs from quote table", () => {
    expect(symbolToCurrencies("EURUSD")).toEqual(["EUR", "USD"]);
    expect(symbolToCurrencies("eur/usd")).toEqual(["EUR", "USD"]);
  });

  it("maps USOIL to USD", () => {
    expect(symbolToCurrencies("USOIL")).toEqual(["USD"]);
  });

  it("returns empty for unknown symbol", () => {
    expect(symbolToCurrencies("ZZZYYY")).toEqual([]);
  });
});
