import { resolveCalendarEvents } from "@/lib/calendar/resolve-calendar";
import type { CalendarSource, Impact } from "@/lib/calendar/types";
import { symbolToCurrencies } from "@/lib/signals/symbol-currencies";

const LOOKBACK_MS = 60 * 60 * 1000;
const LOOKAHEAD_MS = 4 * 60 * 60 * 1000;

export type AiNewsRiskEvent = {
  id: string;
  timeUtc: string;
  currency: string;
  title: string;
  impact: Exclude<Impact, "low">;
  minutesFromNow: number;
  timing: "recent" | "soon";
};

export type AiNewsContext = {
  source: CalendarSource;
  currencies: string[];
  windowMinutes: {
    lookback: number;
    lookahead: number;
  };
  riskLevel: "low" | "medium" | "high";
  events: AiNewsRiskEvent[];
  summary: string;
};

function riskLevelFor(events: AiNewsRiskEvent[]): AiNewsContext["riskLevel"] {
  const highSoon = events.some(
    (event) => event.impact === "high" && event.minutesFromNow >= 0,
  );
  if (highSoon) return "high";
  if (events.some((event) => event.impact === "high")) return "medium";
  if (events.length > 0) return "medium";
  return "low";
}

function buildSummary(events: AiNewsRiskEvent[]) {
  if (events.length === 0) {
    return "No medium/high impact related news in the monitored window.";
  }

  return events
    .slice(0, 5)
    .map((event) => {
      const direction = event.minutesFromNow >= 0 ? "in" : "ago";
      const minutes = Math.abs(event.minutesFromNow);
      return `${event.currency} ${event.impact.toUpperCase()}: ${event.title} (${direction} ${minutes}m)`;
    })
    .join("; ");
}

export async function getAiNewsContext(symbol: string): Promise<AiNewsContext> {
  const currencies = symbolToCurrencies(symbol);
  if (currencies.length === 0) {
    return {
      source: "sample",
      currencies: [],
      windowMinutes: { lookback: 60, lookahead: 240 },
      riskLevel: "low",
      events: [],
      summary: "No mapped economic-calendar currencies for this symbol.",
    };
  }

  const now = Date.now();
  const from = now - LOOKBACK_MS;
  const to = now + LOOKAHEAD_MS;
  const calendar = await resolveCalendarEvents();
  const currencySet = new Set(currencies);

  const events = calendar.events
    .filter((event) => currencySet.has(event.currency.toUpperCase()))
    .filter((event) => event.impact === "medium" || event.impact === "high")
    .map((event) => {
      const time = new Date(event.timeUtc).getTime();
      return { event, time };
    })
    .filter(({ time }) => Number.isFinite(time) && time >= from && time <= to)
    .sort((a, b) => a.time - b.time)
    .slice(0, 8)
    .map(({ event, time }) => {
      const minutesFromNow = Math.round((time - now) / 60_000);
      return {
        id: event.id,
        timeUtc: event.timeUtc,
        currency: event.currency.toUpperCase(),
        title: event.title,
        impact: event.impact as Exclude<Impact, "low">,
        minutesFromNow,
        timing: minutesFromNow < 0 ? "recent" : "soon",
      } satisfies AiNewsRiskEvent;
    });

  return {
    source: calendar.source,
    currencies,
    windowMinutes: { lookback: 60, lookahead: 240 },
    riskLevel: riskLevelFor(events),
    events,
    summary: buildSummary(events),
  };
}
