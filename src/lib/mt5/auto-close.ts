import { prisma } from "@/lib/prisma";
import { sendLocalizedPushToUser } from "@/lib/push-i18n";
import { queueCloseAll } from "@/lib/mt5/commands";
import {
  isWithinWeekendAutoCloseWindow,
  getAutoCloseWeekKey,
  isWithinEndOfDayAutoCloseWindow,
  getAutoCloseDayKey,
} from "@/lib/mt5/market-hours";

export async function maybeTriggerWeekendAutoClose(userId: string): Promise<void> {
  const now = new Date();
  if (!isWithinWeekendAutoCloseWindow(now)) return;

  const connection = await prisma.mt5Connection.findFirst({
    where: { userId, revokedAt: null },
    orderBy: { lastSeenAt: "desc" },
    select: {
      id: true,
      openPositions: true,
      autoCloseBeforeWeekend: true,
      lastAutoCloseTriggeredAt: true,
    },
  });
  if (!connection) return;
  if (!connection.autoCloseBeforeWeekend) return;
  if (connection.openPositions <= 0) return;

  const weekKey = getAutoCloseWeekKey(now);
  if (
    connection.lastAutoCloseTriggeredAt &&
    getAutoCloseWeekKey(connection.lastAutoCloseTriggeredAt) === weekKey
  ) {
    return;
  }

  await queueCloseAll(connection.id);

  await prisma.mt5Connection.update({
    where: { id: connection.id },
    data: { lastAutoCloseTriggeredAt: now },
  });

  const dedupeKey = `mt5-autoclose-${connection.id}-${weekKey}`;
  await prisma.notification.upsert({
    where: { userId_dedupeKey: { userId, dedupeKey } },
    create: { userId, kind: "MT5_AUTO_CLOSE", dedupeKey },
    update: {},
  });

  try {
    await sendLocalizedPushToUser(userId, (t) => ({
      title: t("mt5AutoCloseTitle"),
      body: t("mt5AutoCloseBody"),
      url: "/positions",
    }));
  } catch {
    // Non-blocking
  }
}

export async function maybeTriggerEndOfDayAutoClose(userId: string): Promise<void> {
  const now = new Date();
  if (!isWithinEndOfDayAutoCloseWindow(now)) return;

  const connection = await prisma.mt5Connection.findFirst({
    where: { userId, revokedAt: null },
    orderBy: { lastSeenAt: "desc" },
    select: {
      id: true,
      openPositions: true,
      autoCloseEndOfDay: true,
      lastAutoCloseEodTriggeredAt: true,
    },
  });
  if (!connection) return;
  if (!connection.autoCloseEndOfDay) return;
  if (connection.openPositions <= 0) return;

  const dayKey = getAutoCloseDayKey(now);
  if (
    connection.lastAutoCloseEodTriggeredAt &&
    getAutoCloseDayKey(connection.lastAutoCloseEodTriggeredAt) === dayKey
  ) {
    return;
  }

  await queueCloseAll(connection.id);

  await prisma.mt5Connection.update({
    where: { id: connection.id },
    data: { lastAutoCloseEodTriggeredAt: now },
  });

  const dedupeKey = `mt5-autoclose-eod-${connection.id}-${dayKey}`;
  await prisma.notification.upsert({
    where: { userId_dedupeKey: { userId, dedupeKey } },
    create: { userId, kind: "MT5_AUTO_CLOSE", dedupeKey },
    update: {},
  });

  try {
    await sendLocalizedPushToUser(userId, (t) => ({
      title: t("mt5AutoCloseEodTitle"),
      body: t("mt5AutoCloseEodBody"),
      url: "/positions",
    }));
  } catch {
    // Non-blocking
  }
}

// User arms this while already in profit; once the account's total floating
// P/L drops back to breakeven (<=0), close everything to protect the gain.
// The toggle auto-disables itself after firing — re-arming is a manual,
// deliberate action, not something that repeats unattended.
export async function maybeTriggerBreakevenAutoClose(userId: string): Promise<void> {
  const connection = await prisma.mt5Connection.findFirst({
    where: { userId, revokedAt: null },
    orderBy: { lastSeenAt: "desc" },
    select: {
      id: true,
      openPositions: true,
      closeAllAtBreakeven: true,
      lastPositions: true,
    },
  });
  if (!connection) return;
  if (!connection.closeAllAtBreakeven) return;
  if (connection.openPositions <= 0) return;

  const positions = Array.isArray(connection.lastPositions)
    ? (connection.lastPositions as Record<string, unknown>[])
    : [];
  const totalProfit = positions.reduce((sum, p) => {
    const profit = Number(p.profit);
    return sum + (Number.isFinite(profit) ? profit : 0);
  }, 0);
  if (totalProfit > 0) return;

  await queueCloseAll(connection.id);

  await prisma.mt5Connection.update({
    where: { id: connection.id },
    data: { closeAllAtBreakeven: false },
  });

  const dedupeKey = `mt5-autoclose-breakeven-${connection.id}-${Date.now()}`;
  await prisma.notification.upsert({
    where: { userId_dedupeKey: { userId, dedupeKey } },
    create: { userId, kind: "MT5_AUTO_CLOSE", dedupeKey },
    update: {},
  });

  try {
    await sendLocalizedPushToUser(userId, (t) => ({
      title: t("mt5AutoCloseBreakevenTitle"),
      body: t("mt5AutoCloseBreakevenBody"),
      url: "/positions",
    }));
  } catch {
    // Non-blocking
  }
}
