import { prisma } from "@/lib/prisma";

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

export function getNewsContextWindow(from: Date = new Date()): { from: Date; to: Date } {
  const hours = getNewsContextHours();
  const to = new Date(from.getTime() + hours * 60 * 60 * 1000);
  return { from, to };
}
