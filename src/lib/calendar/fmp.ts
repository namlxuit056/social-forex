import { addDays, format } from "date-fns";
import { createHash } from "crypto";
import type { Impact } from "@/lib/calendar/types";

/** Endpoint lịch kinh tế cần gói FMP cao hơn — không nên hiển thị stack/HTTP thô cho user. */
export class FmpSubscriptionRequiredError extends Error {
  constructor() {
    super("FMP_SUBSCRIPTION_REQUIRED");
    this.name = "FmpSubscriptionRequiredError";
  }
}

function isSubscriptionDenied(status: number, body: string): boolean {
  if (status === 402 || status === 403) return true;
  const b = body.toLowerCase();
  return (
    b.includes("restricted endpoint") ||
    b.includes("subscription") ||
    b.includes("upgrade your plan")
  );
}

export type FmpCalendarRow = {
  externalId: string;
  timeUtc: Date;
  currency: string;
  title: string;
  impact: Impact;
  forecast?: string;
  previous?: string;
  actual?: string;
};

function mapImpact(raw: unknown): Impact {
  const s = String(raw ?? "").toLowerCase();
  if (s.includes("high") || s === "3") return "high";
  if (s.includes("low") || s === "1") return "low";
  return "medium";
}

function parseEventTime(row: Record<string, unknown>): Date | null {
  const d =
    row.date ??
    row.releaseDate ??
    row.time ??
    row.eventDate ??
    row.datetime;
  if (typeof d === "string") {
    const normalized = d.includes("T") ? d : d.replace(" ", "T");
    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function externalIdFor(time: Date, title: string, currency: string): string {
  const h = createHash("sha256")
    .update(`${time.toISOString()}|${title}|${currency}`)
    .digest("hex");
  return `fmp-${h.slice(0, 32)}`;
}

/**
 * Financial Modeling Prep — Economic Calendar (stable).
 * @see https://site.financialmodelingprep.com/developer/docs/stable/economics-calendar
 */
export async function fetchFmpEconomicCalendar(
  apiKey: string,
): Promise<FmpCalendarRow[]> {
  const from = format(new Date(), "yyyy-MM-dd");
  const to = format(addDays(new Date(), 14), "yyyy-MM-dd");
  const url = new URL(
    "https://financialmodelingprep.com/stable/economic-calendar",
  );
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url.toString(), {
    next: { revalidate: 0 },
    headers: { Accept: "application/json" },
  });

  const bodyText = await res.text();

  if (!res.ok) {
    if (isSubscriptionDenied(res.status, bodyText)) {
      throw new FmpSubscriptionRequiredError();
    }
    throw new Error(
      `FMP HTTP ${res.status}: ${bodyText.slice(0, 200)}`,
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(bodyText) as unknown;
  } catch {
    throw new Error("FMP: phản hồi không phải JSON hợp lệ.");
  }

  if (
    json &&
    typeof json === "object" &&
    "Error Message" in json &&
    typeof (json as { "Error Message": unknown })["Error Message"] === "string"
  ) {
    const errMsg = String((json as { "Error Message": string })["Error Message"]);
    if (isSubscriptionDenied(0, errMsg)) {
      throw new FmpSubscriptionRequiredError();
    }
  }
  const rows = Array.isArray(json)
    ? json
    : json &&
        typeof json === "object" &&
        "data" in json &&
        Array.isArray((json as { data: unknown }).data)
      ? (json as { data: unknown[] }).data
      : [];

  const out: FmpCalendarRow[] = [];

  for (const item of rows) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const time = parseEventTime(row);
    if (!time) continue;

    const title = String(row.event ?? row.name ?? row.title ?? "Sự kiện").trim();
    const currency = String(
      row.currency ?? row.country ?? row.countryCode ?? "USD",
    )
      .slice(0, 8)
      .toUpperCase();

    const forecast =
      row.estimate != null
        ? String(row.estimate)
        : row.forecast != null
          ? String(row.forecast)
          : undefined;
    const previous = row.previous != null ? String(row.previous) : undefined;
    const actual = row.actual != null ? String(row.actual) : undefined;

    const externalId = externalIdFor(time, title, currency);

    out.push({
      externalId,
      timeUtc: time,
      currency,
      title,
      impact: mapImpact(row.impact ?? row.importance),
      forecast,
      previous,
      actual,
    });
  }

  return out;
}
