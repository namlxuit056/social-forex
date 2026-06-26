import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveQuotes } from "@/lib/quotes/resolve-quotes";
import { sendPushToUser } from "@/lib/push";

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
    select: { id: true, userId: true, symbol: true, targetPrice: true, direction: true },
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
      if (!hit) return;

      const today = new Date().toISOString().slice(0, 10);
      await prisma.priceAlert.update({
        where: { id: alert.id },
        data: { isActive: false, triggeredAt: new Date() },
      });

      await prisma.notification.upsert({
        where: { userId_dedupeKey: { userId: alert.userId, dedupeKey: `alert-${alert.id}-${today}` } },
        create: {
          userId: alert.userId,
          kind: "PRICE_ALERT",
          dedupeKey: `alert-${alert.id}-${today}`,
        },
        update: {},
      });

      try {
        const dirLabel = alert.direction === "ABOVE" ? "vượt lên" : "chạm xuống";
        await sendPushToUser(alert.userId, {
          title: `${alert.symbol} đã ${dirLabel} ${alert.targetPrice}`,
          body: `Giá hiện tại: ${price.toFixed(5)}. Alert của bạn đã kích hoạt.`,
          url: "/alerts",
        });
      } catch {
        // Non-blocking
      }

      triggered.push(alert.id);
    }),
  );

  return Response.json({ ok: true, triggered: triggered.length, checked: alerts.length });
}
