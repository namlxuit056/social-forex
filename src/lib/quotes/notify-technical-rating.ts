import { prisma } from "@/lib/prisma";
import { sendLocalizedPushToUser } from "@/lib/push-i18n";
import { fetchTechnicalRatings } from "@/lib/quotes/fetch-tv-ratings";
import { computeConfidentSignal } from "@/lib/quotes/technical-rating";

/** Khớp khung giờ tín hiệu chính (4H) — trong lúc tín hiệu "chắc chắn" còn giữ, user
 * nhận lại thông báo tối đa 1 lần / 4 tiếng thay vì mỗi giờ (cron chạy hàng giờ). */
const COOLDOWN_MS = 4 * 60 * 60 * 1000;

export type TechnicalRatingCheckSummary = {
  ok: true;
  checked: number;
  signaled: number;
  notified: number;
};

async function notifySymbolSignal(symbol: string, signal: "buy" | "sell"): Promise<number> {
  const [favoriteRows, openTradeRows] = await Promise.all([
    prisma.userFavoriteSymbol.findMany({
      where: { symbol },
      select: { userId: true },
    }),
    prisma.tradeJournal.findMany({
      where: { symbol, closedAt: null },
      select: { userId: true },
    }),
  ]);

  const userIds = new Set<string>();
  for (const row of favoriteRows) userIds.add(row.userId);
  for (const row of openTradeRows) userIds.add(row.userId);
  if (userIds.size === 0) return 0;

  const dedupeKey = `tv-rating:${symbol}:${signal}:${Math.floor(Date.now() / COOLDOWN_MS)}`;

  await prisma.$transaction(
    [...userIds].map((userId) =>
      prisma.notification.upsert({
        where: { userId_dedupeKey: { userId, dedupeKey } },
        create: { userId, kind: "TECHNICAL_RATING_SIGNAL", dedupeKey },
        update: {},
      }),
    ),
  );

  await Promise.all(
    [...userIds].map(async (userId) => {
      try {
        await sendLocalizedPushToUser(userId, (t) => ({
          title: t(
            signal === "buy" ? "technicalRatingBuyTitle" : "technicalRatingSellTitle",
            { symbol },
          ),
          body: t("technicalRatingBody", { symbol }),
          url: "/quotes",
        }));
      } catch {
        // Non-blocking
      }
    }),
  );

  return userIds.size;
}

/**
 * Quét technical rating (TradingView) cho toàn bộ symbol app hỗ trợ, gửi notification
 * cho user đang theo dõi/có vị thế mở ở symbol có tín hiệu buy/sell "chắc chắn"
 * (4H Strong Buy/Sell + 1D đồng thuận chiều — xem computeConfidentSignal).
 */
export async function checkTechnicalRatingSignals(): Promise<TechnicalRatingCheckSummary> {
  const ratings = await fetchTechnicalRatings();

  let signaled = 0;
  let notified = 0;

  for (const [symbol, scores] of ratings) {
    const signal = computeConfidentSignal(scores);
    if (!signal) continue;
    signaled += 1;

    try {
      notified += await notifySymbolSignal(symbol, signal);
    } catch (e) {
      console.error("[tv-rating] notifySymbolSignal failed for", symbol, e);
    }
  }

  return { ok: true, checked: ratings.size, signaled, notified };
}
