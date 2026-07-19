import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveQuotes } from "@/lib/quotes/resolve-quotes";
import { sendLocalizedPushToUser } from "@/lib/push-i18n";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(req: NextRequest) {
  const expected = process.env.CRON_SECRET || process.env.ADMIN_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === expected || req.nextUrl.searchParams.get("secret") === expected;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

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
    return Response.json({ ok: true, triggered: 0, checked: 0 });
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

  return Response.json({ ok: true, triggered: triggered.length, checked: alerts.length });
}
