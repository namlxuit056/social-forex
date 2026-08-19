import { prisma } from "@/lib/prisma";
import { getCreatedAtRangeForPeriod } from "@/lib/signals/signal-list-date-range";

/** Khung giờ lấy sự kiện “bối cảnh tin” (mặc định 24, tối đa 168). */
export function getNewsContextHours(): number {
  const n = Number(process.env.NEWS_CONTEXT_HOURS);
  if (Number.isFinite(n) && n > 0 && n <= 168) return Math.floor(n);
  return 24;
}

export type NewsContextEventRow = {
  id: string;
  timeUtc: Date;
  currency: string;
  title: string;
  impact: string;
};

/**
 * Sự kiện impact cao trong khoảng thời gian, lọc theo currency (đã map từ cặp).
 */
export async function getUpcomingHighImpactEvents(params: {
  currencies: string[];
  from: Date;
  to: Date;
  limit?: number;
}): Promise<NewsContextEventRow[]> {
  const { currencies, from, to } = params;
  const take = params.limit ?? 20;
  if (currencies.length === 0) return [];

  const rows = await prisma.economicCalendarEvent.findMany({
    where: {
      timeUtc: { gte: from, lte: to },
      currency: { in: currencies },
      impact: { equals: "high", mode: "insensitive" },
    },
    orderBy: { timeUtc: "asc" },
    take,
    select: {
      id: true,
      timeUtc: true,
      currency: true,
      title: true,
      impact: true,
    },
  });

  return rows;
}

/**
 * High + medium impact events for signal list cards (one batched query, then split per pair).
 */
export async function getUpcomingHighAndMediumImpactEvents(params: {
  currencies: string[];
  from: Date;
  to: Date;
  limit?: number;
}): Promise<NewsContextEventRow[]> {
  const { currencies, from, to } = params;
  const take = params.limit ?? 120;
  if (currencies.length === 0) return [];

  const rows = await prisma.economicCalendarEvent.findMany({
    where: {
      timeUtc: { gte: from, lte: to },
      currency: { in: currencies },
      OR: [
        { impact: { equals: "high", mode: "insensitive" } },
        { impact: { equals: "medium", mode: "insensitive" } },
      ],
    },
    orderBy: { timeUtc: "asc" },
    take,
    select: {
      id: true,
      timeUtc: true,
      currency: true,
      title: true,
      impact: true,
    },
  });

  return rows;
}

/**
 * Currencies (ISO codes) with a high-impact event scheduled today (VN calendar day) —
 * used to flag open positions on a currency pair that has news due, without pulling
 * the full event list.
 */
export async function getTodayHighImpactCurrencies(now: Date = new Date()): Promise<string[]> {
  const range = getCreatedAtRangeForPeriod("today", now);
  if (!range) return [];

  const rows = await prisma.economicCalendarEvent.findMany({
    where: {
      timeUtc: { gte: range.gte, lte: range.lte },
      impact: { equals: "high", mode: "insensitive" },
    },
    distinct: ["currency"],
    select: { currency: true },
  });

  return rows.map((r) => r.currency);
}

export function getNewsContextWindow(from: Date = new Date()): { from: Date; to: Date } {
  const hours = getNewsContextHours();
  const to = new Date(from.getTime() + hours * 60 * 60 * 1000);
  return { from, to };
}
