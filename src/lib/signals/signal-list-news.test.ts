import { describe, expect, it } from "vitest";
import { mapCalendarEventsToSignals } from "./signal-list-news";
import type { NewsContextEventRow } from "@/lib/calendar/news-context-db";

function ev(
  id: string,
  currency: string,
  impact: string,
  time: string,
): NewsContextEventRow {
  return {
    id,
    currency,
    impact,
    title: `Event ${id}`,
    timeUtc: new Date(time),
  };
}

describe("mapCalendarEventsToSignals", () => {
  it("maps events to signals by currency", () => {
    const rows = [
      { id: "a", symbol: "EURUSD" },
      { id: "b", symbol: "XAUUSD" },
    ];
    const events = [
      ev("1", "EUR", "high", "2026-04-16T10:00:00.000Z"),
      ev("2", "USD", "medium", "2026-04-16T11:00:00.000Z"),
      ev("3", "JPY", "high", "2026-04-16T12:00:00.000Z"),
    ];
    const out = mapCalendarEventsToSignals(rows, events, 4);
    expect(out.a.map((e) => e.id).sort()).toEqual(["1", "2"]);
    expect(out.b.map((e) => e.id)).toEqual(["2"]);
  });

  it("limits per signal", () => {
    const rows = [{ id: "x", symbol: "EURUSD" }];
    const events = [
      ev("1", "EUR", "high", "2026-04-16T10:00:00.000Z"),
      ev("2", "EUR", "high", "2026-04-16T11:00:00.000Z"),
      ev("3", "EUR", "high", "2026-04-16T12:00:00.000Z"),
      ev("4", "EUR", "high", "2026-04-16T13:00:00.000Z"),
      ev("5", "EUR", "high", "2026-04-16T14:00:00.000Z"),
    ];
    const out = mapCalendarEventsToSignals(rows, events, 2);
    expect(out.x).toHaveLength(2);
  });
});
