import { NextResponse } from "next/server";
import {
  getNewsContextHours,
  getNewsContextWindow,
  getUpcomingHighImpactEvents,
} from "@/lib/calendar/news-context-db";
import { symbolToCurrencies } from "@/lib/signals/symbol-currencies";

export const dynamic = "force-dynamic";

/** Tin high-impact sắp diễn ra cho một symbol — dùng cho news guard ở journal form. */
export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol") ?? "";
  const currencies = symbolToCurrencies(symbol);
  const hours = getNewsContextHours();

  if (currencies.length === 0) {
    return NextResponse.json({ hours, events: [] });
  }

  const { from, to } = getNewsContextWindow();
  const events = await getUpcomingHighImpactEvents({
    currencies,
    from,
    to,
    limit: 5,
  });

  return NextResponse.json({
    hours,
    events: events.map((e) => ({
      id: e.id,
      timeUtc: e.timeUtc.toISOString(),
      currency: e.currency,
      title: e.title,
      impact: e.impact,
    })),
  });
}
