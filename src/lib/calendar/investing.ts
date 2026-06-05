import type { CalendarEvent, Impact } from "@/lib/calendar/types";

const CALENDAR_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";

const CACHE_TTL_MS = 30 * 60 * 1000;
let cachedEvents: CalendarEvent[] | null = null;
let cachedAt = 0;

interface FFEvent {
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast: string;
  previous: string;
  actual?: string;
}

function mapImpact(raw: string): Impact {
  const s = raw.toLowerCase();
  if (s === "high") return "high";
  if (s === "low") return "low";
  return "medium";
}

/**
 * Fetch economic calendar from Forex Factory / Fair Economy (free, no API key).
 * Results cached in-memory for 30 minutes to avoid rate limiting.
 */
export async function fetchInvestingCalendar(): Promise<CalendarEvent[]> {
  if (cachedEvents && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedEvents;
  }

  const res = await fetch(CALENDAR_URL, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Calendar API HTTP ${res.status}`);
  }

  const data = (await res.json()) as FFEvent[];

  if (!Array.isArray(data)) {
    throw new Error("Calendar API: unexpected response format");
  }

  const events = data
    .filter((ev) => ev.impact?.toLowerCase() !== "holiday")
    .map((ev, i) => {
      const d = new Date(ev.date);
      const timeUtc = Number.isNaN(d.getTime())
        ? new Date().toISOString()
        : d.toISOString();

      return {
        id: `ff-${i}-${d.getTime() || 0}`,
        timeUtc,
        currency: (ev.country || "USD").slice(0, 3).toUpperCase(),
        title: ev.title || "Event",
        impact: mapImpact(ev.impact || "medium"),
        forecast: ev.forecast || undefined,
        previous: ev.previous || undefined,
        actual: ev.actual || undefined,
      };
    });

  cachedEvents = events;
  cachedAt = Date.now();

  return events;
}
