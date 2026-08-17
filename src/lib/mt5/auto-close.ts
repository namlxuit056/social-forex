import { prisma } from "@/lib/prisma";
import { sendLocalizedPushToUser, type PushTranslator } from "@/lib/push-i18n";
import { queueCloseAll } from "@/lib/mt5/commands";
import {
  isWithinWeekendAutoCloseWindow,
  getAutoCloseWeekKey,
  isWithinEndOfDayAutoCloseWindow,
  getAutoCloseDayKey,
  isWithinScheduledCloseWindow,
  getScheduledCloseDayKey,
  type ScheduledCloseTz,
} from "@/lib/mt5/market-hours";
import type { Prisma } from "@/generated/prisma/client";

type PushMessageKey = Parameters<PushTranslator>[0];
type PushCopy = { dedupeKey: string; titleKey: PushMessageKey; bodyKey: PushMessageKey };

/**
 * Runs all four auto-close checks (weekend, end-of-day, breakeven, scheduled)
 * against a single fetched connection row instead of one query each — this is
 * called every ~POLL_MS from the /positions SSE stream, so cutting 4 DB
 * round-trips down to 1 matters a lot for Neon compute-hour usage.
 */
export async function runAutoCloseChecks(userId: string): Promise<void> {
  const now = new Date();

  const connection = await prisma.mt5Connection.findFirst({
    where: { userId, revokedAt: null },
    orderBy: { lastSeenAt: "desc" },
    select: {
      id: true,
      openPositions: true,
      lastPositions: true,
      autoCloseBeforeWeekend: true,
      lastAutoCloseTriggeredAt: true,
      autoCloseEndOfDay: true,
      lastAutoCloseEodTriggeredAt: true,
      closeAllAtBreakeven: true,
      scheduledCloseEnabled: true,
      scheduledCloseTime: true,
      scheduledCloseTz: true,
      lastScheduledCloseTriggeredAt: true,
    },
  });
  if (!connection || connection.openPositions <= 0) return;

  const data: Prisma.Mt5ConnectionUpdateInput = {};
  const pushes: PushCopy[] = [];

  if (connection.autoCloseBeforeWeekend && isWithinWeekendAutoCloseWindow(now)) {
    const weekKey = getAutoCloseWeekKey(now);
    const alreadyFired =
      connection.lastAutoCloseTriggeredAt &&
      getAutoCloseWeekKey(connection.lastAutoCloseTriggeredAt) === weekKey;
    if (!alreadyFired) {
      data.lastAutoCloseTriggeredAt = now;
      pushes.push({
        dedupeKey: `mt5-autoclose-${connection.id}-${weekKey}`,
        titleKey: "mt5AutoCloseTitle",
        bodyKey: "mt5AutoCloseBody",
      });
    }
  }

  if (connection.autoCloseEndOfDay && isWithinEndOfDayAutoCloseWindow(now)) {
    const dayKey = getAutoCloseDayKey(now);
    const alreadyFired =
      connection.lastAutoCloseEodTriggeredAt &&
      getAutoCloseDayKey(connection.lastAutoCloseEodTriggeredAt) === dayKey;
    if (!alreadyFired) {
      data.lastAutoCloseEodTriggeredAt = now;
      pushes.push({
        dedupeKey: `mt5-autoclose-eod-${connection.id}-${dayKey}`,
        titleKey: "mt5AutoCloseEodTitle",
        bodyKey: "mt5AutoCloseEodBody",
      });
    }
  }

  // User arms this while already in profit; once the account's total floating
  // P/L drops back to breakeven (<=0), close everything to protect the gain.
  // Self-disarms after firing — re-arming is a manual, deliberate action.
  if (connection.closeAllAtBreakeven) {
    const positions = Array.isArray(connection.lastPositions)
      ? (connection.lastPositions as Record<string, unknown>[])
      : [];
    const totalProfit = positions.reduce((sum, p) => {
      const profit = Number(p.profit);
      return sum + (Number.isFinite(profit) ? profit : 0);
    }, 0);
    if (totalProfit <= 0) {
      data.closeAllAtBreakeven = false;
      pushes.push({
        dedupeKey: `mt5-autoclose-breakeven-${connection.id}-${now.getTime()}`,
        titleKey: "mt5AutoCloseBreakevenTitle",
        bodyKey: "mt5AutoCloseBreakevenBody",
      });
    }
  }

  // User picks a daily wall-clock time (VN or UTC) at which all open
  // positions close automatically. Doesn't self-disarm — fires again the
  // next day — so dedupe is by day key, same as weekend/EOD.
  if (connection.scheduledCloseEnabled && connection.scheduledCloseTime) {
    const tz: ScheduledCloseTz = connection.scheduledCloseTz === "vn" ? "vn" : "utc";
    if (isWithinScheduledCloseWindow(now, connection.scheduledCloseTime, tz)) {
      const dayKey = getScheduledCloseDayKey(now, tz);
      const alreadyFired =
        connection.lastScheduledCloseTriggeredAt &&
        getScheduledCloseDayKey(connection.lastScheduledCloseTriggeredAt, tz) === dayKey;
      if (!alreadyFired) {
        data.lastScheduledCloseTriggeredAt = now;
        pushes.push({
          dedupeKey: `mt5-autoclose-scheduled-${connection.id}-${dayKey}`,
          titleKey: "mt5AutoCloseScheduledTitle",
          bodyKey: "mt5AutoCloseScheduledBody",
        });
      }
    }
  }

  if (pushes.length === 0) return;

  await queueCloseAll(connection.id);
  await prisma.mt5Connection.update({ where: { id: connection.id }, data });

  for (const { dedupeKey, titleKey, bodyKey } of pushes) {
    await prisma.notification.upsert({
      where: { userId_dedupeKey: { userId, dedupeKey } },
      create: { userId, kind: "MT5_AUTO_CLOSE", dedupeKey },
      update: {},
    });

    try {
      await sendLocalizedPushToUser(userId, (t) => ({
        title: t(titleKey),
        body: t(bodyKey),
        url: "/positions",
      }));
    } catch {
      // Non-blocking
    }
  }
}
