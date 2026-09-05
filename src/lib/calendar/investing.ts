import type { CalendarEvent, Impact } from "@/lib/calendar/types";

const CALENDAR_URL = "https://www.forexfactory.com/calendar";
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const CACHE_TTL_MS = 15 * 60 * 1000;
let cachedEvents: CalendarEvent[] | null = null;
let cachedAt = 0;

type FfScrapedEvent = {
  id: number;
  name: string;
  /** Unix seconds của chính sự kiện (khác `day.dateline` — đó chỉ là mốc đầu ngày). */
  dateline: number;
  currency: string;
  impactName: string;
  actual?: string;
  forecast?: string;
  previous?: string;
};

type FfDay = { events?: FfScrapedEvent[] };

function mapImpact(raw: string): Impact | null {
  const s = raw.toLowerCase();
  if (s === "high") return "high";
  if (s === "medium") return "medium";
  if (s === "low") return "low";
  return null; // "holiday" và giá trị lạ khác -> bỏ qua sự kiện
}

/**
 * Trích mảng `days` nhúng trong `window.calendarComponentStates[1] = {days: [...], ...}`.
 * Đây là JS object literal (key không có ngoặc kép) nên không thể JSON.parse cả blob —
 * phải cân bằng ngoặc `[...]` thủ công để lấy đúng phần mảng `days` (bên trong mảng, mọi
 * key/string đều hợp lệ JSON nên JSON.parse riêng phần đó là được).
 */
export function extractDays(html: string): FfDay[] {
  const marker = "window.calendarComponentStates[1] = {";
  const stateStart = html.indexOf(marker);
  const daysIdx = stateStart === -1 ? -1 : html.indexOf("days:", stateStart);
  const arrStart = daysIdx === -1 ? -1 : html.indexOf("[", daysIdx);
  if (arrStart === -1) {
    throw new Error("ForexFactory HTML: calendarComponentStates.days not found (page structure changed?)");
  }

  let depth = 0;
  let inStr = false;
  let esc = false;
  let end = -1;
  for (let i = arrStart; i < html.length; i++) {
    const ch = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end === -1) {
    throw new Error("ForexFactory HTML: unterminated days array");
  }

  return JSON.parse(html.slice(arrStart, end)) as FfDay[];
}

/**
 * Scrape lịch kinh tế đầy đủ từ forexfactory.com/calendar (không phải widget JSON free
 * `ff_calendar_thisweek.json` — widget đó không bao giờ trả `actual`, xem
 * project-calendar-actual-data-source trong memory). Trang HTML nhúng sẵn dữ liệu đầy đủ
 * (kể cả actual đã công bố) trong một thẻ <script>.
 */
export async function fetchInvestingCalendar(): Promise<CalendarEvent[]> {
  if (cachedEvents && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedEvents;
  }

  const res = await fetch(CALENDAR_URL, {
    headers: {
      "User-Agent": BROWSER_USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`ForexFactory HTTP ${res.status}`);
  }

  const html = await res.text();
  const days = extractDays(html);

  const events: CalendarEvent[] = [];
  for (const day of days) {
    for (const ev of day.events ?? []) {
      const impact = mapImpact(ev.impactName);
      if (!impact) continue;
      if (!ev.currency || ev.currency === "All") continue;

      events.push({
        id: `ff-${ev.id}`,
        timeUtc: new Date(ev.dateline * 1000).toISOString(),
        currency: ev.currency.toUpperCase(),
        title: ev.name || "Event",
        impact,
        forecast: ev.forecast || undefined,
        previous: ev.previous || undefined,
        actual: ev.actual || undefined,
      });
    }
  }

  cachedEvents = events;
  cachedAt = Date.now();

  return events;
}
