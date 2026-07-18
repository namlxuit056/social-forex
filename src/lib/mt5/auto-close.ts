import { prisma } from "@/lib/prisma";
import { sendLocalizedPushToUser } from "@/lib/push-i18n";
import { queueCloseAll } from "@/lib/mt5/commands";
import { isWithinWeekendAutoCloseWindow, getAutoCloseWeekKey } from "@/lib/mt5/market-hours";

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
