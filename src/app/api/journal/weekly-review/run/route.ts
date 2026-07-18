import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAiJournalAnalysis } from "@/lib/ai/journal-analysis";
import { sendLocalizedPushToUser } from "@/lib/push-i18n";
import type { AppLocale } from "@/lib/api-locale";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(req: NextRequest) {
  const expected = process.env.CRON_SECRET || process.env.ADMIN_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === expected || req.nextUrl.searchParams.get("secret") === expected;
}

// Trả về khoảng Mon–Sun của tuần chứa "now". Đủ để dùng cho cron chạy
// thứ 6 cuối ngày (tuần đang diễn ra, đã đóng hết lệnh Mon-Fri) lẫn cron
// chạy Chủ Nhật tối (tuần vừa kết thúc) — cùng weekStart nên upsert dedupe
// tự động bỏ qua nếu đã có review.
function getCurrentWeekRange(): { weekStart: Date; weekEnd: Date } {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon...
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday,
  ));
  const sunday = new Date(Date.UTC(
    monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6,
    23, 59, 59, 999,
  ));
  return { weekStart: monday, weekEnd: sunday };
}

const MIN_TRADES = 3;
const BATCH_SIZE = 5;

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { weekStart, weekEnd } = getCurrentWeekRange();

  const usersWithTrades = await prisma.tradeJournal.groupBy({
    by: ["userId"],
    where: {
      closedAt: { gte: weekStart, lte: weekEnd },
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
        const existing = await prisma.aiWeeklyJournalReview.findUnique({
          where: { userId_weekStart: { userId, weekStart } },
          select: { id: true },
        });
        if (existing) { results.skipped++; return; }

        const trades = await prisma.tradeJournal.findMany({
          where: { userId, closedAt: { gte: weekStart, lte: weekEnd } },
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

          await prisma.aiWeeklyJournalReview.upsert({
            where: { userId_weekStart: { userId, weekStart } },
            create: { userId, weekStart, weekEnd, tradeCount: _count.id, analysis, locale: "vi" },
            update: { analysis, tradeCount: _count.id },
          });

          try {
            await sendLocalizedPushToUser(userId, (t) => ({
              title: t("weeklyReviewTitle"),
              body: t("weeklyReviewBody", { count: _count.id }),
              url: "/journal?tab=weekly",
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

  return Response.json({ ok: true, weekStart, weekEnd, ...results });
}
