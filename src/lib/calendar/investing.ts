import type { CalendarEvent, Impact } from "@/lib/calendar/types";

const CALENDAR_URL = "https://economic-calendar.tradingview.com/events";
/** Endpoint chỉ chấp nhận request có Origin khớp domain của chính TradingView (không phải
 * Cloudflare bot-check — chỉ so khớp header tĩnh, không cần giải JS challenge như FF/investing.com). */
const ORIGIN_HEADER = "https://www.tradingview.com";

/** Mã quốc gia 2 ký tự cho các đồng tiền app hỗ trợ (QUOTE_DEFINITIONS) + CNY vì
 * dữ liệu Trung Quốc thường ảnh hưởng AUD/NZD. */
const COUNTRIES = ["US", "EU", "GB", "JP", "AU", "CA", "NZ", "CH", "CN"];

const CACHE_TTL_MS = 15 * 60 * 1000;
let cachedEvents: CalendarEvent[] | null = null;
let cachedAt = 0;

/** Chỉ dùng trong test — xoá cache in-memory giữa các test case. */
export function __resetInvestingCacheForTests(): void {
  cachedEvents = null;
  cachedAt = 0;
}

type TvEvent = {
  id: string;
  title?: string;
  currency?: string;
  actual?: number | null;
  previous?: number | null;
  forecast?: number | null;
  unit?: string;
  scale?: string;
  importance?: number;
  date: string;
};

function mapImpact(importance: number | undefined): Impact {
  if (importance !== undefined && importance >= 1) return "high";
  if (importance !== undefined && importance <= -1) return "low";
  return "medium";
}

/** "6.4" + unit "%" -> "6.4%"; "7.271" + scale "M" -> "7.271M"; "1.2" + unit "$" + scale "B" -> "$1.2B". */
export function formatTvValue(
  value: number | null | undefined,
  unit?: string,
  scale?: string,
): string | undefined {
  if (value === null || value === undefined) return undefined;
  const scaleSuffix = scale ?? "";
  if (!unit) return `${value}${scaleSuffix}`;
  if (unit === "%") return `${value}${scaleSuffix}%`;
  return `${unit}${value}${scaleSuffix}`;
}

/**
 * Lấy lịch kinh tế (forecast/previous/actual) từ endpoint public đứng sau widget Economic
 * Calendar của TradingView. Đây KHÔNG phải API chính thức có tài liệu, nhưng public, free,
 * trả JSON có actual (không như widget FF), và không bị Cloudflare Managed Challenge chặn
 * như forexfactory.com/investing.com — chỉ cần header Origin khớp domain TradingView.
 * Xem project-calendar-actual-data-source trong memory.
 */
export async function fetchInvestingCalendar(): Promise<CalendarEvent[]> {
  if (cachedEvents && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedEvents;
  }

  const now = Date.now();
  const from = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
  const url = `${CALENDAR_URL}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&countries=${COUNTRIES.join(",")}`;

  const res = await fetch(url, {
    headers: { Origin: ORIGIN_HEADER, Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`TradingView calendar HTTP ${res.status}`);
  }

  const data = (await res.json()) as { status?: string; result?: TvEvent[] };
  if (data.status !== "ok" || !Array.isArray(data.result)) {
    throw new Error("TradingView calendar: unexpected response format");
  }

  const events: CalendarEvent[] = data.result
    .filter((ev) => ev.currency)
    .map((ev) => ({
      id: `tv-${ev.id}`,
      timeUtc: ev.date,
      currency: ev.currency!.toUpperCase(),
      title: ev.title || "Event",
      impact: mapImpact(ev.importance),
      forecast: formatTvValue(ev.forecast, ev.unit, ev.scale),
      previous: formatTvValue(ev.previous, ev.unit, ev.scale),
      actual: formatTvValue(ev.actual, ev.unit, ev.scale),
    }));

  cachedEvents = events;
  cachedAt = Date.now();

  return events;
}
