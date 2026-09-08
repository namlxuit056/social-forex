import { prisma } from "@/lib/prisma";
import { fetchTechnicalRatings } from "@/lib/quotes/fetch-tv-ratings";
import {
  evaluateSignalOutcomes,
  type EvaluateOutcomesResult,
} from "@/lib/quotes/signal-outcome-store";
import { computeDailySummary, type SignalEvent } from "@/lib/quotes/technical-rating-summary";

function utcDayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function isSignalMeta(meta: unknown): meta is { symbol: string; signal: "buy" | "sell" } {
  if (!meta || typeof meta !== "object") return false;
  const m = meta as Record<string, unknown>;
  // Tổng kết này chỉ tính tín hiệu TradingView (heldSignals dựa trên score4h TV). Tín hiệu
  // từ nguồn ngoài (meta.source khác "tradingview") không nằm trong phạm vi tổng kết ngày.
  if (m.source !== undefined && m.source !== "tradingview") return false;
  return typeof m.symbol === "string" && (m.signal === "buy" || m.signal === "sell");
}

export type DailyRatingSummaryResult = {
  ok: true;
  day: string;
  totalSignals: number;
  buySignals: number;
  sellSignals: number;
  heldSignals: number;
  /** Kết quả chấm các tín hiệu đã đủ horizon (bảng điểm độ chính xác theo nguồn). */
  outcomes: EvaluateOutcomesResult;
};

/**
 * Cron cuối ngày: tổng kết các tín hiệu kỹ thuật "chắc chắn" đã fire trong ngày UTC hôm nay,
 * lưu 1 dòng TechnicalRatingDailySummary. Tuần/tháng được cộng dồn từ các dòng ngày khi hiển
 * thị (xem rollupSummaries), không tính/lưu riêng ở đây.
 */
export async function runDailyRatingSummary(): Promise<DailyRatingSummaryResult> {
  const day = utcDayStart(new Date());
  const nextDay = new Date(day.getTime() + 24 * 60 * 60 * 1000);

  const rows = await prisma.notification.findMany({
    where: {
      kind: "TECHNICAL_RATING_SIGNAL",
      createdAt: { gte: day, lt: nextDay },
    },
    select: { dedupeKey: true, meta: true },
  });

  // Broadcast tạo 1 dòng Notification / user cho cùng 1 sự kiện tín hiệu — dedupe theo
  // dedupeKey (duy nhất theo symbol+signal+khung giờ 4h cooldown) để đếm đúng số sự kiện thật.
  const eventsByDedupeKey = new Map<string, SignalEvent>();
  for (const row of rows) {
    if (eventsByDedupeKey.has(row.dedupeKey)) continue;
    if (!isSignalMeta(row.meta)) continue;
    eventsByDedupeKey.set(row.dedupeKey, { symbol: row.meta.symbol, signal: row.meta.signal });
  }
  const events = [...eventsByDedupeKey.values()];

  const ratings = await fetchTechnicalRatings();
  const currentScore4hBySymbol = new Map(
    [...ratings.entries()].map(([symbol, scores]) => [symbol, scores.score4h]),
  );

  const summary = computeDailySummary(events, currentScore4hBySymbol);

  await prisma.technicalRatingDailySummary.upsert({
    where: { day },
    create: {
      day,
      totalSignals: summary.totalSignals,
      buySignals: summary.buySignals,
      sellSignals: summary.sellSignals,
      heldSignals: summary.heldSignals,
      topSymbols: summary.topSymbols,
    },
    update: {
      totalSignals: summary.totalSignals,
      buySignals: summary.buySignals,
      sellSignals: summary.sellSignals,
      heldSignals: summary.heldSignals,
      topSymbols: summary.topSymbols,
    },
  });

  const outcomes = await evaluateSignalOutcomes();

  return {
    ok: true,
    day: day.toISOString().slice(0, 10),
    totalSignals: summary.totalSignals,
    buySignals: summary.buySignals,
    sellSignals: summary.sellSignals,
    heldSignals: summary.heldSignals,
    outcomes,
  };
}
