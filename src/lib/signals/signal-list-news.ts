import type { NewsContextEventRow } from "@/lib/calendar/news-context-db";
import { symbolToCurrencies } from "@/lib/signals/symbol-currencies";

/** Serializable for client components */
export type SignalCardNewsEvent = {
  id: string;
  timeUtc: string;
  currency: string;
  title: string;
  impact: string;
};

function impactRank(impact: string): number {
  const x = impact.toLowerCase();
  if (x === "high" || x.includes("high")) return 0;
  if (x === "medium" || x.includes("medium")) return 1;
  return 2;
}

/**
 * Assigns shared calendar rows to each signal by matching event.currency to the pair’s currencies.
 */
export function mapCalendarEventsToSignals(
  signalRows: { id: string; symbol: string }[],
  events: NewsContextEventRow[],
  maxPerSignal = 4,
): Record<string, SignalCardNewsEvent[]> {
  const out: Record<string, SignalCardNewsEvent[]> = {};
  for (const row of signalRows) {
    out[row.id] = [];
  }

  for (const row of signalRows) {
    const cc = new Set(symbolToCurrencies(row.symbol));
    if (cc.size === 0) continue;

    const picked = events
      .filter((ev) => cc.has(ev.currency))
      .sort(
        (a, b) =>
          impactRank(a.impact) - impactRank(b.impact) ||
          a.timeUtc.getTime() - b.timeUtc.getTime(),
      )
      .slice(0, maxPerSignal)
      .map((ev) => ({
        id: ev.id,
        timeUtc: ev.timeUtc.toISOString(),
        currency: ev.currency,
        title: ev.title,
        impact: ev.impact,
      }));
    out[row.id] = picked;
  }

  return out;
}
