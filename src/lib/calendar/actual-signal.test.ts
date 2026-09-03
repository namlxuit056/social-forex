import { describe, expect, it } from "vitest";
import { computeActualSignal, parseIndicatorValue } from "./actual-signal";
import type { CalendarEvent } from "./types";

function event(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: "ev1",
    timeUtc: "2026-09-03T12:30:00.000Z",
    currency: "USD",
    title: "Non-Farm Payrolls",
    impact: "high",
    ...overrides,
  };
}

describe("parseIndicatorValue", () => {
  it("parses plain decimals", () => {
    expect(parseIndicatorValue("3.5")).toBe(3.5);
    expect(parseIndicatorValue("-0.3")).toBe(-0.3);
  });

  it("parses percentages", () => {
    expect(parseIndicatorValue("3.5%")).toBe(3.5);
  });

  it("parses K/M/B suffixes", () => {
    expect(parseIndicatorValue("199K")).toBe(199_000);
    expect(parseIndicatorValue("1.2M")).toBe(1_200_000);
  });

  it("parses parenthesised negatives", () => {
    expect(parseIndicatorValue("(0.4%)")).toBe(-0.4);
  });

  it("parses comma thousand separators", () => {
    expect(parseIndicatorValue("1,234")).toBe(1234);
  });

  it("returns null for empty/dash/garbage", () => {
    expect(parseIndicatorValue("")).toBeNull();
    expect(parseIndicatorValue("-")).toBeNull();
    expect(parseIndicatorValue("n/a")).toBeNull();
  });
});

describe("computeActualSignal", () => {
  it("returns null when actual is missing", () => {
    expect(computeActualSignal(event({ forecast: "3.0", actual: undefined }))).toBeNull();
  });

  it("returns null when neither forecast nor previous is available", () => {
    expect(computeActualSignal(event({ actual: "3.5" }))).toBeNull();
  });

  it("USD beats forecast -> bullish USD -> sell EURUSD, buy USDJPY", () => {
    const signal = computeActualSignal(
      event({ currency: "USD", forecast: "3.0", actual: "3.5" }),
    );
    expect(signal?.bias).toBe("bullish");
    expect(signal?.baseline).toBe("forecast");
    const eurusd = signal?.pairs.find((p) => p.pair === "EURUSD");
    const usdjpy = signal?.pairs.find((p) => p.pair === "USDJPY");
    expect(eurusd?.actionBias).toBe("sell");
    expect(usdjpy?.actionBias).toBe("buy");
  });

  it("USD misses forecast -> bearish USD -> buy EURUSD, sell USDJPY", () => {
    const signal = computeActualSignal(
      event({ currency: "USD", forecast: "3.5", actual: "3.0" }),
    );
    expect(signal?.bias).toBe("bearish");
    const eurusd = signal?.pairs.find((p) => p.pair === "EURUSD");
    const usdjpy = signal?.pairs.find((p) => p.pair === "USDJPY");
    expect(eurusd?.actionBias).toBe("buy");
    expect(usdjpy?.actionBias).toBe("sell");
  });

  it("USD-quoted commodities follow the quote-currency rule (bullish USD -> sell XAUUSD)", () => {
    const signal = computeActualSignal(
      event({ currency: "USD", forecast: "3.0", actual: "3.5" }),
    );
    const xauusd = signal?.pairs.find((p) => p.pair === "XAUUSD");
    expect(xauusd?.actionBias).toBe("sell");
  });

  it("inverse indicators (unemployment) flip the bias — lower actual is bullish", () => {
    const signal = computeActualSignal(
      event({ currency: "USD", title: "Unemployment Rate", forecast: "4.0", actual: "3.8" }),
    );
    expect(signal?.bias).toBe("bullish");
  });

  it("falls back to previous when forecast is missing", () => {
    const signal = computeActualSignal(
      event({ currency: "USD", previous: "3.0", actual: "3.5" }),
    );
    expect(signal?.baseline).toBe("previous");
    expect(signal?.bias).toBe("bullish");
  });

  it("returns neutral bias when actual matches the baseline within tolerance", () => {
    const signal = computeActualSignal(
      event({ currency: "USD", forecast: "3.500", actual: "3.501" }),
    );
    expect(signal?.bias).toBe("neutral");
    expect(signal?.pairs.every((p) => p.actionBias === "neutral")).toBe(true);
  });

  it("non-USD currency: bullish base currency buys the pair, bearish quote currency sells", () => {
    const eur = computeActualSignal(
      event({ currency: "EUR", forecast: "1.0", actual: "1.5" }),
    );
    expect(eur?.bias).toBe("bullish");
    expect(eur?.pairs.find((p) => p.pair === "EURUSD")?.actionBias).toBe("buy");
    expect(eur?.pairs.find((p) => p.pair === "EURGBP")?.actionBias).toBe("buy");
  });
});
