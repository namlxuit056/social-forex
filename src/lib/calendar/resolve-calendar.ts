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
import { captureActualBaseline, notifyActualTransitions } from "@/lib/calendar/notify-actual-signal";
import { prisma } from "@/lib/prisma";

const SYNC_ID = "default";

function ttlMs(): number {
  const m = Number(process.env.CALENDAR_SYNC_TTL_MINUTES);
  return (Number.isFinite(m) && m > 0 ? m : 15) * 60 * 1000;
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

  const baseline = await captureActualBaseline();

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
  } catch (e) {
    console.error(
      "[calendar] persistToDb failed, lastSyncAt not advanced:",
      e instanceof Error ? e.message : e,
    );
    return;
  }

  try {
    await notifyActualTransitions(unique, baseline);
  } catch (e) {
    console.error("[calendar] notifyActualTransitions failed:", e);
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
          warning: { key: "investingApiStaleDb" },
          syncedAt: meta?.lastSyncAt.toISOString(),
        };
      }
      return {
        events: sampleCalendar,
        source: "sample",
        warning: { key: "investingNoEventsSample" },
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
        warning: { key: "investingSyncFailedDb", detail: message },
        syncedAt: meta?.lastSyncAt.toISOString(),
      };
    }

    return {
      events: sampleCalendar,
      source: "sample",
      warning: { key: "investingFetchFailedSample", detail: message },
    };
  }
}

async function resolveViaFmp(): Promise<ResolveCalendarResult> {
  const key = process.env.FMP_API_KEY?.trim();

  if (!key) {
    return {
      events: sampleCalendar,
      source: "sample",
      warning: { key: "fmpNoApiKey" },
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
    const fmpBaseline = await captureActualBaseline();

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

    try {
      await notifyActualTransitions(
        fetched.map((r) => ({
          id: r.externalId,
          timeUtc: r.timeUtc.toISOString(),
          currency: r.currency,
          title: r.title,
          impact: r.impact,
          forecast: r.forecast ?? undefined,
          previous: r.previous ?? undefined,
          actual: r.actual ?? undefined,
        })),
        fmpBaseline,
      );
    } catch (e) {
      console.error("[calendar] notifyActualTransitions (fmp) failed:", e);
    }

    const rows = await prisma.economicCalendarEvent.findMany({
      orderBy: { timeUtc: "asc" },
    });

    if (rows.length === 0) {
      return {
        events: sampleCalendar,
        source: "sample",
        warning: { key: "fmpNoRowsSample" },
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
        warning: { key: "fmp402Sample" },
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
          ? { key: "fmpPaywallStaleDb" }
          : { key: "fmpSyncFailedDb", detail: message },
        syncedAt: meta?.lastSyncAt.toISOString(),
      };
    }
    return {
      events: sampleCalendar,
      source: "sample",
      warning: looksLikePaywall
        ? { key: "fmpPaywallSample" }
        : { key: "fmpSyncFailedSample", detail: message },
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
