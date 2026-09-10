import { prisma } from "@/lib/prisma";
import { sendLocalizedPushToUser } from "@/lib/push-i18n";
import { computeActualSignal } from "@/lib/calendar/actual-signal";
import type { CalendarEvent } from "@/lib/calendar/types";

/**
 * Đọc actual hiện tại trong DB (khoá theo externalId) TRƯỚC KHI persistToDb wipe bảng —
 * dùng để phát hiện sự kiện vừa chuyển từ chưa có actual -> có actual trong lần sync này.
 */
export async function captureActualBaseline(): Promise<Map<string, string | null>> {
  const rows = await prisma.economicCalendarEvent.findMany({
    select: { externalId: true, actual: true },
  });
  return new Map(rows.map((r) => [r.externalId, r.actual]));
}

async function notifyOneEvent(event: CalendarEvent): Promise<void> {
  const signal = computeActualSignal(event);
  if (!signal || signal.bias === "neutral") return;

  const pairs = signal.pairs.filter((p) => p.actionBias !== "neutral");
  if (pairs.length === 0) return;
  const symbols = pairs.map((p) => p.pair);

  const [favoriteRows, openTradeRows] = await Promise.all([
    prisma.userFavoriteSymbol.findMany({
      where: { symbol: { in: symbols } },
      select: { userId: true },
    }),
    prisma.tradeJournal.findMany({
      where: { symbol: { in: symbols }, closedAt: null },
      select: { userId: true },
    }),
  ]);

  const userIds = new Set<string>();
  for (const row of favoriteRows) userIds.add(row.userId);
  for (const row of openTradeRows) userIds.add(row.userId);
  if (userIds.size === 0) return;

  const dedupeKey = `calendar-actual:${event.id}`;
  const meta = {
    eventId: event.id,
    title: event.title,
    currency: event.currency,
    bias: signal.bias,
  };

  await prisma.$transaction(
    [...userIds].map((userId) =>
      prisma.notification.upsert({
        where: { userId_dedupeKey: { userId, dedupeKey } },
        create: { userId, kind: "CALENDAR_ACTUAL_SIGNAL", dedupeKey, meta },
        update: { meta },
      }),
    ),
  );

  const pairsSummary = (buy: string, sell: string) =>
    pairs.map((p) => `${p.pair} ${p.actionBias === "buy" ? buy : sell}`).join(" · ");

  await Promise.all(
    [...userIds].map(async (userId) => {
      try {
        await sendLocalizedPushToUser(userId, (t) => ({
          title: t(
            signal.bias === "bullish"
              ? "calendarActualBullishTitle"
              : "calendarActualBearishTitle",
            { currency: event.currency },
          ),
          body: t(
            signal.baseline === "forecast"
              ? "calendarActualBodyForecast"
              : "calendarActualBodyPrevious",
            {
              event: event.title,
              actual: event.actual ?? "",
              baseline: (signal.baseline === "forecast" ? event.forecast : event.previous) ?? "",
              pairs: pairsSummary(t("calendarActualBuy"), t("calendarActualSell")),
            },
          ),
          url: `/calendar?currencies=${event.currency}&highlight=${encodeURIComponent(event.id)}`,
        }));
      } catch {
        // Non-blocking
      }
    }),
  );
}

/**
 * So sánh actual mới (từ lần sync vừa fetch) với baseline đọc trước khi wipe DB,
 * rồi gửi notification cho các sự kiện vừa có actual + signal buy/sell không neutral.
 * Không chặn luồng sync chính — mọi lỗi được nuốt (log) để không ảnh hưởng response calendar.
 */
export async function notifyActualTransitions(
  freshEvents: CalendarEvent[],
  baseline: Map<string, string | null>,
): Promise<void> {
  const newlyActual = freshEvents.filter(
    (ev) => ev.actual?.trim() && !baseline.get(ev.id)?.trim(),
  );
  if (newlyActual.length === 0) return;

  for (const ev of newlyActual) {
    try {
      await notifyOneEvent(ev);
    } catch (e) {
      console.error("[calendar] notifyActualTransitions failed for", ev.id, e);
    }
  }
}
