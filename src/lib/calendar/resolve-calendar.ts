import {
  FmpSubscriptionRequiredError,
  fetchFmpEconomicCalendar,
} from "@/lib/calendar/fmp";
import { fetchInvestingCalendar } from "@/lib/calendar/investing";
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

function chosenProvider(): "investing" | "fmp" | "sample" {
  const p = process.env.CALENDAR_PROVIDER?.toLowerCase();
  if (p === "fmp") return "fmp";
  if (p === "sample") return "sample";
  return "investing";
}

const INVESTING_SYNC_ID = "investing";

async function persistToDb(events: CalendarEvent[]) {
  const seen = new Set<string>();
  const unique = events.filter((ev) => {
    if (seen.has(ev.id)) return false;
    seen.add(ev.id);
    return true;
  });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.economicCalendarEvent.deleteMany({});
      if (unique.length > 0) {
        await tx.economicCalendarEvent.createMany({
          data: unique.map((ev) => ({
            externalId: ev.id,
            timeUtc: new Date(ev.timeUtc),
            currency: ev.currency,
            title: ev.title,
            impact: ev.impact,
            forecast: ev.forecast ?? null,
            previous: ev.previous ?? null,
            actual: ev.actual ?? null,
          })),
        });
      }
      await tx.calendarSyncMeta.upsert({
        where: { id: INVESTING_SYNC_ID },
        create: {
          id: INVESTING_SYNC_ID,
          lastSyncAt: new Date(),
          source: "investing",
        },
        update: {
          lastSyncAt: new Date(),
          source: "investing",
        },
      });
    });
  } catch {
    // DB persist failed silently — in-memory cache still works
  }
}

async function resolveViaInvesting(): Promise<ResolveCalendarResult> {
  const meta = await prisma.calendarSyncMeta.findUnique({
    where: { id: INVESTING_SYNC_ID },
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
      source: "investing",
      syncedAt: meta!.lastSyncAt.toISOString(),
    };
  }

  try {
    const events = await fetchInvestingCalendar();

    if (events.length === 0) {
      if (dbEvents.length > 0) {
        return {
          events: dbEvents.map(dbToEvent),
          source: "stale_db",
          warning: "API không trả sự kiện mới — hiển thị cache DB.",
          syncedAt: meta?.lastSyncAt.toISOString(),
        };
      }
      return {
        events: sampleCalendar,
        source: "sample",
        warning:
          "Không có sự kiện lịch kinh tế tuần này — hiển thị dữ liệu mẫu.",
      };
    }

    await persistToDb(events);

    return {
      events,
      source: "investing",
      syncedAt: new Date().toISOString(),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";

    if (dbEvents.length > 0) {
      return {
        events: dbEvents.map(dbToEvent),
        source: "stale_db",
        warning: `Không đồng bộ được (${message}). Hiển thị cache DB.`,
        syncedAt: meta?.lastSyncAt.toISOString(),
      };
    }

    return {
      events: sampleCalendar,
      source: "sample",
      warning: `Không lấy được lịch kinh tế (${message}). Đang hiển thị dữ liệu mẫu.`,
    };
  }
}

async function resolveViaFmp(): Promise<ResolveCalendarResult> {
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
          "FMP cần gói trả phí (HTTP 402). Đang hiển thị mẫu. Đổi CALENDAR_PROVIDER=investing (mặc định) để dùng nguồn free.",
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
        ? "FMP cần gói trả phí. Đang hiển thị dữ liệu mẫu."
        : `Không đồng bộ FMP (${message}). Hiển thị mẫu.`,
    };
  }
}

export async function resolveCalendarEvents(): Promise<ResolveCalendarResult> {
  const provider = chosenProvider();

  if (provider === "sample") {
    return { events: sampleCalendar, source: "sample" };
  }

  if (provider === "fmp") {
    return resolveViaFmp();
  }

  return resolveViaInvesting();
}
