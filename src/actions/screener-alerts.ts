"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, NotificationKind } from "@/generated/prisma/client";
import type { ScreenerPair } from "@/app/api/screener/route";
import type { CustomFilters } from "@/components/screener/screener-filter-builder";

// Re-export ScreenerPair for use in other files
export type { ScreenerPair } from "@/app/api/screener/route";

/* ── Condition matching ── */

function matchRangeCondition(
  value: number | null | undefined,
  condition?: { operator: string; value: number; max?: number },
): boolean {
  if (!condition || value == null) return true; // no filter = pass
  switch (condition.operator) {
    case "gt":
      return value > condition.value;
    case "lt":
      return value < condition.value;
    case "between":
      return value >= condition.value && value <= (condition.max ?? condition.value);
    default:
      return true;
  }
}

function matchMultiSelectCondition(
  value: string | null | undefined,
  condition?: { selected: string[] },
): boolean {
  if (!condition || !condition.selected.length) return true; // no filter = pass
  if (!value) return false;
  return condition.selected.includes(value);
}

function matchRecCondition(
  value: number | null | undefined,
  condition?: { selected: string[] },
): boolean {
  if (!condition || !condition.selected.length) return true;
  if (value == null) return false;
  // Map selected labels to numeric ranges
  const labelToRange: Record<string, [number, number]> = {
    "Strong Buy": [0.3, 1],
    Buy: [0.05, 0.3],
    Neutral: [-0.05, 0.05],
    Sell: [-0.3, -0.05],
    "Strong Sell": [-1, -0.3],
  };
  return condition.selected.some((label) => {
    const range = labelToRange[label];
    if (!range) return false;
    return value >= range[0] && value <= range[1];
  });
}

export function pairMatchesFilters(
  pair: ScreenerPair,
  filters: CustomFilters,
): boolean {
  // Range filters
  if (!matchRangeCondition(pair.rsi, filters.rsi)) return false;
  if (!matchRangeCondition(pair.adx, filters.adx)) return false;
  if (!matchRangeCondition(pair.changePercent, filters.changePercent)) return false;

  // Multi-select filters
  if (!matchMultiSelectCondition(pair.emaBias, filters.emaBias)) return false;
  if (!matchMultiSelectCondition(pair.group, filters.group)) return false;

  // Recommendation filters
  if (!matchRecCondition(pair.recM15, filters.recM15)) return false;
  if (!matchRecCondition(pair.recH1, filters.recH1)) return false;
  if (!matchRecCondition(pair.recH4, filters.recH4)) return false;
  if (!matchRecCondition(pair.recD1, filters.recD1)) return false;

  return true;
}

/* ── Alert check (called by background or on-demand) ── */

const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

type AlertCheckResult = {
  triggered: Array<{
    alertId: string;
    alertName: string;
    symbol: string;
  }>;
  errors: string[];
};

export async function checkScreenerAlerts(
  pairs: ScreenerPair[],
): Promise<AlertCheckResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { triggered: [], errors: ["unauthorized"] };
  }

  const userId = session.user.id;

  // Get all active alerts for this user
  const alerts = await prisma.screenerAlert.findMany({
    where: { userId, isActive: true },
    include: {
      logs: {
        orderBy: { triggeredAt: "desc" },
        take: 100,
      },
    },
  });

  if (!alerts.length) {
    return { triggered: [], errors: [] };
  }

  const triggered: AlertCheckResult["triggered"] = [];
  const errors: string[] = [];

  for (const alert of alerts) {
    const conditions = alert.conditions as CustomFilters;
    const now = new Date();

    for (const pair of pairs) {
      if (!pairMatchesFilters(pair, conditions)) continue;

      // Check cooldown: last triggered for this symbol
      const lastLog = alert.logs.find((l) => l.symbol === pair.symbol);
      if (lastLog) {
        const elapsed = now.getTime() - new Date(lastLog.triggeredAt).getTime();
        if (elapsed < COOLDOWN_MS) continue; // still in cooldown
      }

      // Create alert log
      await prisma.screenerAlertLog.create({
        data: {
          alertId: alert.id,
          symbol: pair.symbol,
          data: pair as unknown as Prisma.InputJsonValue,
        },
      });

      // Update lastTriggeredAt
      await prisma.screenerAlert.update({
        where: { id: alert.id },
        data: { lastTriggeredAt: now },
      });

      // Create in-app notification
      try {
        await prisma.notification.create({
          data: {
            userId,
            kind: "SCREENER_ALERT" as NotificationKind,
            dedupeKey: `screener-alert:${alert.id}:${pair.symbol}:${Math.floor(now.getTime() / COOLDOWN_MS)}`,
            actorUserId: userId,
          },
        });
      } catch {
        // Dedupe key conflict = already notified this cooldown window
      }

      triggered.push({
        alertId: alert.id,
        alertName: alert.name,
        symbol: pair.symbol,
      });
    }
  }

  return { triggered, errors };
}

/* ── Telegram notification for triggered alerts ── */

async function sendTelegramMessage(text: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID ?? "@toolforex";
  if (!botToken) return;

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

export async function sendScreenerAlertTelegram(
  alertName: string,
  symbols: string[],
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  const message =
    `🔔 <b>Screener Alert: ${alertName}</b>\n\n` +
    `Matched pairs: ${symbols.join(", ")}\n\n` +
    `Check the screener for details.`;

  try {
    await sendTelegramMessage(message);
  } catch {
    // Non-blocking
  }
}
