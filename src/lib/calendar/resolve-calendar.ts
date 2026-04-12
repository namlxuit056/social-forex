import {
  FmpSubscriptionRequiredError,
  fetchFmpEconomicCalendar,
} from "@/lib/calendar/fmp";
import type {
  CalendarEvent,
  Impact,
  ResolveCalendarResult,
} from "@/lib/calendar/types";
import { sampleCalendar } from "@/lib/data/calendar-sample";
import { prisma } from "@/lib/prisma";

const SYNC_ID = "default";

function ttlMs(): number {
  const m = Number(process.env.CALENDAR_SYNC_TTL_MINUTES);
  return (Number.isFinite(m) && m > 0 ? m : 45) * 60 * 1000;
}

function dbToEvent(row: {
  id: string;
  timeUtc: Date;
  currency: string;
  title: string;
  impact: string;
  forecast: string | null;
  previous: string | null;
  actual: string | null;
}): CalendarEvent {
  return {
    id: row.id,
    timeUtc: row.timeUtc.toISOString(),
    currency: row.currency,
    title: row.title,
    impact: row.impact as Impact,
    forecast: row.forecast ?? undefined,
    previous: row.previous ?? undefined,
    actual: row.actual ?? undefined,
  };
}

export async function resolveCalendarEvents(): Promise<ResolveCalendarResult> {
  const key = process.env.FMP_API_KEY?.trim();

  if (!key) {
    return {
      events: sampleCalendar,
      source: "sample",
      warning:
        "Chưa cấu hình FMP_API_KEY — hiển thị dữ liệu mẫu. Thêm key tại Financial Modeling Prep.",
    };
  }

  const meta = await prisma.calendarSyncMeta.findUnique({
    where: { id: SYNC_ID },
  });
  const dbEvents = await prisma.economicCalendarEvent.findMany({
    orderBy: { timeUtc: "asc" },
  });

  const stale =
    !meta ||
    Date.now() - meta.lastSyncAt.getTime() >= ttlMs() ||
    dbEvents.length === 0;

  if (!stale && dbEvents.length > 0) {
    return {
      events: dbEvents.map(dbToEvent),
      source: "fmp",
      syncedAt: meta!.lastSyncAt.toISOString(),
    };
  }

  try {
    const fetched = await fetchFmpEconomicCalendar(key);

    await prisma.$transaction(async (tx) => {
      await tx.economicCalendarEvent.deleteMany({});
      if (fetched.length > 0) {
        await tx.economicCalendarEvent.createMany({
          data: fetched.map((r) => ({
            externalId: r.externalId,
            timeUtc: r.timeUtc,
            currency: r.currency,
            title: r.title,
            impact: r.impact,
            forecast: r.forecast ?? null,
            previous: r.previous ?? null,
            actual: r.actual ?? null,
          })),
        });
      }
      await tx.calendarSyncMeta.upsert({
        where: { id: SYNC_ID },
        create: {
          id: SYNC_ID,
          lastSyncAt: new Date(),
          source: fetched.length ? "fmp" : "fmp_empty",
        },
        update: {
          lastSyncAt: new Date(),
          source: fetched.length ? "fmp" : "fmp_empty",
        },
      });
    });

    const rows = await prisma.economicCalendarEvent.findMany({
      orderBy: { timeUtc: "asc" },
    });

    if (rows.length === 0) {
      return {
        events: sampleCalendar,
        source: "sample",
        warning:
          "FMP không trả sự kiện trong khoảng ngày hiện tại — hiển thị mẫu.",
        syncedAt: new Date().toISOString(),
      };
    }

    const m = await prisma.calendarSyncMeta.findUnique({
      where: { id: SYNC_ID },
    });
    return {
      events: rows.map(dbToEvent),
      source: "fmp",
      syncedAt: m?.lastSyncAt.toISOString(),
    };
  } catch (e) {
    if (e instanceof FmpSubscriptionRequiredError) {
      return {
        events: sampleCalendar,
        source: "sample",
        warning:
          "Economic Calendar trên FMP cần gói trả phí (HTTP 402 — endpoint bị giới hạn). Đang hiển thị dữ liệu mẫu. Bạn có thể nâng cấp tại financialmodelingprep.com hoặc xóa FMP_API_KEY để ẩn cảnh báo này và chỉ dùng mẫu.",
      };
    }

    const message = e instanceof Error ? e.message : "Unknown error";
    const looksLikePaywall =
      /\b402\b/.test(message) ||
      /restricted endpoint/i.test(message) ||
      /subscription/i.test(message);

    if (dbEvents.length > 0) {
      return {
        events: dbEvents.map(dbToEvent),
        source: "stale_db",
        warning: looksLikePaywall
          ? "FMP từ chối endpoint lịch (gói hiện tại). Hiển thị cache DB đã lưu."
          : `Không đồng bộ FMP (${message}). Hiển thị cache DB.`,
        syncedAt: meta?.lastSyncAt.toISOString(),
      };
    }
    return {
      events: sampleCalendar,
      source: "sample",
      warning: looksLikePaywall
        ? "Economic Calendar trên FMP cần gói trả phí. Đang hiển thị dữ liệu mẫu."
        : `Không đồng bộ FMP (${message}). Hiển thị mẫu.`,
    };
  }
}
