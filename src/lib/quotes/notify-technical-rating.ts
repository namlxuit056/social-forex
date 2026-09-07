import { prisma } from "@/lib/prisma";
import { sendLocalizedPushToUser } from "@/lib/push-i18n";
import { fetchTechnicalRatings } from "@/lib/quotes/fetch-tv-ratings";
import {
  computeConfidentSignal,
  computePriceLevels,
  type SymbolScores,
} from "@/lib/quotes/technical-rating";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Khớp khung giờ tín hiệu chính (4H) — trong lúc tín hiệu "chắc chắn" còn giữ, user
 * nhận lại thông báo tối đa 1 lần / 4 tiếng thay vì mỗi giờ (cron chạy hàng giờ). */
const COOLDOWN_MS = 4 * 60 * 60 * 1000;

export type TechnicalRatingCheckSummary = {
  ok: true;
  checked: number;
  signaled: number;
  notified: number;
  /** Chi tiết từng symbol đã fire — hữu ích để xem trên /admin/crons kể cả khi
   * notified=0 (chưa ai favorite/có vị thế ở symbol đó). */
  signals: {
    symbol: string;
    signal: "buy" | "sell";
    score4h: number;
    score1d: number;
    entryLow: number;
    entryHigh: number;
    stopLoss: number;
    takeProfit: number;
    notifiedUsers: number;
  }[];
};

async function notifySymbolSignal(
  symbol: string,
  signal: "buy" | "sell",
  scores: SymbolScores,
): Promise<number> {
  // Broadcast tới toàn bộ user đã đăng ký — không lọc theo favorite/vị thế mở (theo yêu cầu
  // user 2026-09-05: "không cần favorite nhận hết").
  const allUsers = await prisma.user.findMany({ select: { id: true } });
  const userIds = new Set(allUsers.map((u) => u.id));
  if (userIds.size === 0) return 0;

  const dedupeKey = `tv-rating:${symbol}:${signal}:${Math.floor(Date.now() / COOLDOWN_MS)}`;
  const levels = computePriceLevels(signal, scores);
  const meta = {
    symbol,
    signal,
    score4h: round2(scores.score4h),
    score1d: round2(scores.score1d),
    ...levels,
  };

  await prisma.$transaction(
    [...userIds].map((userId) =>
      prisma.notification.upsert({
        where: { userId_dedupeKey: { userId, dedupeKey } },
        create: { userId, kind: "TECHNICAL_RATING_SIGNAL", dedupeKey, meta },
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
          body: t("technicalRatingBody", {
            entryLow: meta.entryLow,
            entryHigh: meta.entryHigh,
            stopLoss: meta.stopLoss,
            takeProfit: meta.takeProfit,
          }),
          url: "/quotes/technical-rating",
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
  const signals: TechnicalRatingCheckSummary["signals"] = [];

  for (const [symbol, scores] of ratings) {
    const signal = computeConfidentSignal(scores);
    if (!signal) continue;
    signaled += 1;

    let notifiedUsers = 0;
    try {
      notifiedUsers = await notifySymbolSignal(symbol, signal, scores);
      notified += notifiedUsers;
    } catch (e) {
      console.error("[tv-rating] notifySymbolSignal failed for", symbol, e);
    }
    const levels = computePriceLevels(signal, scores);
    signals.push({
      symbol,
      signal,
      score4h: scores.score4h,
      score1d: scores.score1d,
      ...levels,
      notifiedUsers,
    });
  }

  return { ok: true, checked: ratings.size, signaled, notified, signals };
}
