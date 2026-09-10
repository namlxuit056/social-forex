import { describe, expect, it } from "vitest";
import {
  aggregateSignalDirections,
  type RawSignalNotif,
} from "./recent-signal-directions";

function notif(
  dedupeKey: string,
  createdAt: string,
  meta: Record<string, unknown> | null,
): RawSignalNotif {
  return { dedupeKey, createdAt: new Date(createdAt), meta };
}

describe("aggregateSignalDirections", () => {
  it("drops TradingView and malformed rows", () => {
    const rows = [
      notif("a", "2026-09-10T00:00:00Z", {
        source: "tradingview",
        symbol: "EURUSD",
        signal: "buy",
      }),
      notif("b", "2026-09-10T00:00:00Z", { source: "oandaBook", symbol: "EURUSD" }),
      notif("c", "2026-09-10T00:00:00Z", null),
    ];
    expect(aggregateSignalDirections(rows)).toEqual([]);
  });

  it("counts one vote per source and resolves the bias by majority", () => {
    const rows = [
      notif("1", "2026-09-10T08:00:00Z", {
        source: "oandaBook",
        symbol: "XAUUSD",
        signal: "sell",
        stance: "contrarian",
      }),
      notif("2", "2026-09-10T07:00:00Z", {
        source: "myfxbook",
        symbol: "XAUUSD",
        signal: "sell",
        stance: "contrarian",
      }),
      notif("3", "2026-09-10T06:00:00Z", {
        source: "cot",
        symbol: "XAUUSD",
        signal: "buy",
        stance: "trend",
      }),
    ];

    const [row] = aggregateSignalDirections(rows);
    expect(row.symbol).toBe("XAUUSD");
    expect(row.buyCount).toBe(1);
    expect(row.sellCount).toBe(2);
    expect(row.bias).toBe("sell");
    expect(row.sources).toHaveLength(3);
    expect(row.latestAt.toISOString()).toBe("2026-09-10T08:00:00.000Z");
  });

  it("keeps only the newest signal per source", () => {
    const rows = [
      notif("new", "2026-09-10T12:00:00Z", {
        source: "oandaBook",
        symbol: "GBPUSD",
        signal: "buy",
        stance: "contrarian",
      }),
      notif("old", "2026-09-08T12:00:00Z", {
        source: "oandaBook",
        symbol: "GBPUSD",
        signal: "sell",
        stance: "contrarian",
      }),
    ];

    const [row] = aggregateSignalDirections(rows);
    expect(row.sources).toHaveLength(1);
    expect(row.sources[0].signal).toBe("buy");
    expect(row.bias).toBe("buy");
  });

  it("marks a symbol mixed when sources are split evenly", () => {
    const rows = [
      notif("1", "2026-09-10T08:00:00Z", {
        source: "oandaBook",
        symbol: "USDJPY",
        signal: "buy",
        stance: "contrarian",
      }),
      notif("2", "2026-09-10T07:00:00Z", {
        source: "myfxbook",
        symbol: "USDJPY",
        signal: "sell",
        stance: "contrarian",
      }),
    ];
    expect(aggregateSignalDirections(rows)[0].bias).toBe("mixed");
  });

  it("orders symbols by most recent signal first", () => {
    const rows = [
      notif("1", "2026-09-09T08:00:00Z", {
        source: "oandaBook",
        symbol: "OLD",
        signal: "buy",
      }),
      notif("2", "2026-09-10T08:00:00Z", {
        source: "oandaBook",
        symbol: "NEW",
        signal: "buy",
      }),
    ];
    expect(aggregateSignalDirections(rows).map((r) => r.symbol)).toEqual([
      "NEW",
      "OLD",
    ]);
  });
});
