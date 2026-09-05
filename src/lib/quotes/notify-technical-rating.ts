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
  /** Chi tiết từng symbol đã fire — hữu ích để xem trên /admin/crons kể cả khi
   * notified=0 (chưa ai favorite/có vị thế ở symbol đó). */
  signals: { symbol: string; signal: "buy" | "sell"; score4h: number; score1d: number; notifiedUsers: number }[];
};

async function notifySymbolSignal(symbol: string, signal: "buy" | "sell"): Promise<number> {
  // Broadcast tới toàn bộ user đã đăng ký — không lọc theo favorite/vị thế mở (theo yêu cầu
  // user 2026-09-05: "không cần favorite nhận hết").
  const allUsers = await prisma.user.findMany({ select: { id: true } });
  const userIds = new Set(allUsers.map((u) => u.id));
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
  const signals: TechnicalRatingCheckSummary["signals"] = [];

  for (const [symbol, scores] of ratings) {
    const signal = computeConfidentSignal(scores);
    if (!signal) continue;
    signaled += 1;

    let notifiedUsers = 0;
    try {
      notifiedUsers = await notifySymbolSignal(symbol, signal);
      notified += notifiedUsers;
    } catch (e) {
      console.error("[tv-rating] notifySymbolSignal failed for", symbol, e);
    }
    signals.push({ symbol, signal, score4h: scores.score4h, score1d: scores.score1d, notifiedUsers });
  }

  return { ok: true, checked: ratings.size, signaled, notified, signals };
}
