import { describe, expect, it } from "vitest";
import {
  latestTvSignals,
  signalValidity,
  type RawSignalNotif,
} from "./recent-signal-directions";

function notif(
  dedupeKey: string,
  createdAt: string,
  meta: Record<string, unknown> | null,
): RawSignalNotif {
  return { dedupeKey, createdAt: new Date(createdAt), meta };
}

describe("latestTvSignals", () => {
  it("keeps only TradingView rows and drops malformed ones", () => {
    const rows = [
      notif("a", "2026-09-10T00:00:00Z", {
        source: "oandaBook",
        symbol: "EURUSD",
        signal: "buy",
      }),
      notif("b", "2026-09-10T00:00:00Z", {
        source: "tradingview",
        symbol: "EURUSD",
      }),
      notif("c", "2026-09-10T00:00:00Z", null),
    ];
    expect(latestTvSignals(rows)).toEqual([]);
  });

  it("returns one row per symbol using the newest signal", () => {
    const rows = [
      notif("new", "2026-09-10T12:00:00Z", {
        source: "tradingview",
        symbol: "GBPUSD",
        signal: "buy",
        score4h: 0.7,
        score1d: 0.5,
        entryLow: 1.27,
        entryHigh: 1.272,
        stopLoss: 1.265,
        takeProfit: 1.28,
      }),
      notif("old", "2026-09-08T12:00:00Z", {
        source: "tradingview",
        symbol: "GBPUSD",
        signal: "sell",
      }),
    ];

    const out = latestTvSignals(rows);
    expect(out).toHaveLength(1);
    expect(out[0].signal).toBe("buy");
    expect(out[0].entryLow).toBe(1.27);
    expect(out[0].takeProfit).toBe(1.28);
    expect(out[0].at.toISOString()).toBe("2026-09-10T12:00:00.000Z");
  });

  it("picks the favorable edge of the entry zone as bestEntry", () => {
    const buy = latestTvSignals([
      notif("b", "2026-09-10T00:00:00Z", {
        source: "tradingview",
        symbol: "EURUSD",
        signal: "buy",
        entryLow: 1.1,
        entryHigh: 1.105,
      }),
    ]);
    expect(buy[0].bestEntry).toBe(1.1);

    const sell = latestTvSignals([
      notif("s", "2026-09-10T00:00:00Z", {
        source: "tradingview",
        symbol: "USDJPY",
        signal: "sell",
        entryLow: 150,
        entryHigh: 150.4,
      }),
    ]);
    expect(sell[0].bestEntry).toBe(150.4);
  });

  it("coerces missing/invalid numeric levels to null", () => {
    const rows = [
      notif("1", "2026-09-10T00:00:00Z", {
        source: "tradingview",
        symbol: "XAUUSD",
        signal: "sell",
      }),
    ];
    const [row] = latestTvSignals(rows);
    expect(row.entryLow).toBeNull();
    expect(row.score4h).toBeNull();
  });

  it("orders symbols by most recent signal first", () => {
    const rows = [
      notif("1", "2026-09-09T08:00:00Z", {
        source: "tradingview",
        symbol: "OLD",
        signal: "buy",
      }),
      notif("2", "2026-09-10T08:00:00Z", {
        source: "tradingview",
        symbol: "NEW",
        signal: "buy",
      }),
    ];
    expect(latestTvSignals(rows).map((r) => r.symbol)).toEqual(["NEW", "OLD"]);
  });
});

describe("signalValidity", () => {
  it("holds when the current 4H score agrees with the signal", () => {
    expect(signalValidity("buy", 0.6)).toBe("holding");
    expect(signalValidity("sell", -0.3)).toBe("holding");
  });

  it("reverses when the current 4H score flips against the signal", () => {
    expect(signalValidity("buy", -0.4)).toBe("reversing");
    expect(signalValidity("sell", 0.2)).toBe("reversing");
  });

  it("is unclear inside the neutral band or without data", () => {
    expect(signalValidity("buy", 0.05)).toBe("unclear");
    expect(signalValidity("sell", -0.09)).toBe("unclear");
    expect(signalValidity("buy", null)).toBe("unclear");
    expect(signalValidity("buy", undefined)).toBe("unclear");
  });
});
