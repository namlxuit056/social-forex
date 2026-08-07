import { prisma } from "@/lib/prisma";
import { resolveQuotes } from "@/lib/quotes/resolve-quotes";
import { sendLocalizedPushToUser } from "@/lib/push-i18n";

export type PriceAlertCheckSummary = { ok: true; triggered: number; checked: number };

/** Evaluates every active PriceAlert against the latest quotes and fires notifications
 * for the ones that crossed their target. Shared by the cron (/api/price-alerts/check)
 * and the manual "Run now" trigger in /admin/crons. */
export async function checkPriceAlerts(): Promise<PriceAlertCheckSummary> {
  const alerts = await prisma.priceAlert.findMany({
    where: { isActive: true },
    select: {
      id: true,
      userId: true,
      symbol: true,
      targetPrice: true,
      direction: true,
      isRecurring: true,
      cooldownMinutes: true,
      armed: true,
      triggeredAt: true,
    },
  });

  if (alerts.length === 0) {
    return { ok: true, triggered: 0, checked: 0 };
  }

  const quotesResponse = await resolveQuotes();
  const priceMap = new Map(
    quotesResponse.quotes.map((q) => [q.symbol, (q.bid + q.ask) / 2]),
  );

  const triggered: string[] = [];

  await Promise.all(
    alerts.map(async (alert) => {
      const price = priceMap.get(alert.symbol);
      if (price === undefined) return;

      const hit =
        alert.direction === "ABOVE" ? price >= alert.targetPrice : price <= alert.targetPrice;

      const now = new Date();

      if (alert.isRecurring) {
        if (!hit) {
          // Price is back on the other side of the threshold: re-arm for the next cross
          if (!alert.armed) {
            await prisma.priceAlert.update({
              where: { id: alert.id },
              data: { armed: true },
            });
          }
          return;
        }
        if (!alert.armed) return;
        const cooldownMs = alert.cooldownMinutes * 60_000;
        if (alert.triggeredAt && now.getTime() - alert.triggeredAt.getTime() < cooldownMs) {
          return;
        }
        await prisma.priceAlert.update({
          where: { id: alert.id },
          data: { armed: false, triggeredAt: now },
        });
      } else {
        if (!hit) return;
        await prisma.priceAlert.update({
          where: { id: alert.id },
          data: { isActive: false, triggeredAt: now },
        });
      }

      // Recurring alerts fire many times, so the dedupe key must be unique per fire
      const dedupeKey = alert.isRecurring
        ? `alert-${alert.id}-${now.getTime()}`
        : `alert-${alert.id}-${now.toISOString().slice(0, 10)}`;

      await prisma.notification.upsert({
        where: { userId_dedupeKey: { userId: alert.userId, dedupeKey } },
        create: {
          userId: alert.userId,
          kind: "PRICE_ALERT",
          dedupeKey,
        },
        update: {},
      });

      try {
        await sendLocalizedPushToUser(alert.userId, (t) => ({
          title: t(
            alert.direction === "ABOVE"
              ? "priceAlertAboveTitle"
              : "priceAlertBelowTitle",
            { symbol: alert.symbol, price: alert.targetPrice },
          ),
          body: t("priceAlertBody", { price: price.toFixed(5) }),
          url: "/alerts",
        }));
      } catch {
        // Non-blocking
      }

      triggered.push(alert.id);
    }),
  );

  return { ok: true, triggered: triggered.length, checked: alerts.length };
}
