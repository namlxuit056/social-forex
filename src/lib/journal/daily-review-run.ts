import { startOfDay, endOfDay, subDays } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { getAiJournalAnalysis } from "@/lib/ai/journal-analysis";
import { sendLocalizedPushToUser } from "@/lib/push-i18n";
import type { AppLocale } from "@/lib/api-locale";

const DAILY_REVIEW_TZ = "Asia/Ho_Chi_Minh";

// Cron chạy 00:05 giờ VN (17:05 UTC), tức là ngày VN mới vừa bắt đầu — nên
// tính review cho NGÀY HÔM QUA (giờ VN) để lấy trọn vẹn dữ liệu cả ngày.
function getYesterdayVnRange(): { dayStart: Date; dayEnd: Date } {
  const now = new Date();
  const zonedYesterday = subDays(toZonedTime(now, DAILY_REVIEW_TZ), 1);
  const start = startOfDay(zonedYesterday);
  const end = endOfDay(zonedYesterday);
  return {
    dayStart: fromZonedTime(start, DAILY_REVIEW_TZ),
    dayEnd: fromZonedTime(end, DAILY_REVIEW_TZ),
  };
}

const MIN_TRADES = 1;
const BATCH_SIZE = 5;

export type JournalDailyReviewSummary = {
  ok: true;
  dayStart: Date;
  dayEnd: Date;
  processed: number;
  skipped: number;
  errors: number;
};

/** Generates the AI daily journal review for every user with >= 1 closed trade on the
 * previous VN calendar day (upsert-dedupe, so re-running is a no-op for users already done).
 * Shared by the cron (/api/journal/daily-review/run) and the manual "Run now" trigger in
 * /admin/crons. */
export async function runJournalDailyReview(): Promise<JournalDailyReviewSummary> {
  const { dayStart, dayEnd } = getYesterdayVnRange();

  const usersWithTrades = await prisma.tradeJournal.groupBy({
    by: ["userId"],
    where: {
      closedAt: { gte: dayStart, lte: dayEnd },
      result: { not: "PENDING" },
    },
    _count: { id: true },
    having: { id: { _count: { gte: MIN_TRADES } } },
  });

  const results = { processed: 0, skipped: 0, errors: 0 };

  for (let i = 0; i < usersWithTrades.length; i += BATCH_SIZE) {
    const batch = usersWithTrades.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async ({ userId, _count }) => {
        const existing = await prisma.aiDailyJournalReview.findUnique({
          where: { userId_day: { userId, day: dayStart } },
          select: { id: true },
        });
        if (existing) { results.skipped++; return; }

        const trades = await prisma.tradeJournal.findMany({
          where: { userId, closedAt: { gte: dayStart, lte: dayEnd } },
          orderBy: { openedAt: "desc" },
          take: 200,
        });

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true },
        });
        if (!user) { results.skipped++; return; }

        try {
          const analysis = await getAiJournalAnalysis({ trades, locale: "vi" as AppLocale });

          await prisma.aiDailyJournalReview.upsert({
            where: { userId_day: { userId, day: dayStart } },
            create: { userId, day: dayStart, dayEnd, tradeCount: _count.id, analysis, locale: "vi" },
            update: { analysis, tradeCount: _count.id },
          });

          try {
            await sendLocalizedPushToUser(userId, (t) => ({
              title: t("dailyReviewTitle"),
              body: t("dailyReviewBody", { count: _count.id }),
              url: "/journal?tab=daily",
            }));
          } catch {
            // Non-blocking
          }

          results.processed++;
        } catch {
          results.errors++;
        }
      }),
    );
  }

  return { ok: true, dayStart, dayEnd, ...results };
}
