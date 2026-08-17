"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { auth } from "@/auth";
import { routing } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { updateStreak } from "@/lib/streak";
import { addXp } from "@/lib/add-xp";
import { countTrailingLosses, COOLDOWN_THRESHOLD_LOSSES } from "@/lib/journal/loss-streak";
import { isOverDailyTradeLimit, utcDayRange } from "@/lib/journal/daily-limit";
import { parseTradeSetup } from "@/lib/journal/setups";
import { parseJournalImageUrl, parseTradeEmotion } from "@/lib/journal/emotions";
import { isPushEnabled, sendPushToUser } from "@/lib/push";

function revalidateJournalPaths() {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/journal`, "page");
  }
}

/** Push đúng 1 lần khi chuỗi thua trong 24h vừa chạm ngưỡng. Non-blocking. */
async function maybeNotifyLossStreak(userId: string) {
  try {
    if (!isPushEnabled()) return;
    const recent = await prisma.tradeJournal.findMany({
      where: { userId, closedAt: { not: null } },
      orderBy: { closedAt: "desc" },
      take: 10,
      select: { result: true, closedAt: true },
    });
    if (countTrailingLosses(recent) !== COOLDOWN_THRESHOLD_LOSSES) return;
    const t = await getTranslations("journal");
    await sendPushToUser(userId, {
      title: t("lossStreakPushTitle"),
      body: t("lossStreakPushBody", { count: COOLDOWN_THRESHOLD_LOSSES }),
      url: "/journal",
    });
  } catch {
    // Non-blocking
  }
}

/**
 * So với DailyTradingPlan.maxTrades của ngày `openedAt`. Trả về thông tin vượt
 * ngưỡng (để hiện cảnh báo dạng confirm) hoặc null nếu không có plan/không giới hạn.
 *
 * TODO business: maxRiskPercent chưa enforce ở đây — TradeJournal không có field
 * risk% hay account equity đáng tin cậy (không phải lệnh nào cũng gắn MT5 connection),
 * nên không có cách tính risk% thực đã dùng trong ngày mà không đoán số liệu.
 */
async function checkDailyTradeLimit(userId: string, openedAt: Date) {
  const { start, end } = utcDayRange(openedAt);
  const plan = await prisma.dailyTradingPlan.findUnique({
    where: { userId_planDate: { userId, planDate: start } },
    select: { maxTrades: true },
  });
  if (!plan?.maxTrades) return null;

  const tradesLoggedToday = await prisma.tradeJournal.count({
    where: { userId, openedAt: { gte: start, lt: end } },
  });
  if (!isOverDailyTradeLimit(tradesLoggedToday, plan.maxTrades)) return null;

  return { tradesLoggedToday, maxTrades: plan.maxTrades };
}

const tradeSchema = z.object({
  symbol: z.string().min(2).max(32),
  direction: z.enum(["LONG", "SHORT"]),
  entry: z.coerce.number().positive(),
  stopLoss: z.coerce.number().optional().nullable(),
  takeProfit: z.coerce.number().optional().nullable(),
  exitPrice: z.coerce.number().optional().nullable(),
  lotSize: z.coerce.number().positive().optional().nullable(),
  result: z.enum(["WIN", "LOSS", "BREAKEVEN", "PENDING"]),
  pnl: z.coerce.number().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  openedAt: z.coerce.date().optional(),
  closedAt: z.coerce.date().optional().nullable(),
});

function parseOptNum(fd: FormData, key: string): number | null {
  const v = fd.get(key);
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function createTrade(
  _prev:
    | { error?: string; ok?: boolean; dailyLimitWarning?: { tradesLoggedToday: number; maxTrades: number } }
    | null,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const parsed = tradeSchema.safeParse({
    symbol: formData.get("symbol"),
    direction: formData.get("direction"),
    entry: formData.get("entry"),
    stopLoss: parseOptNum(formData, "stopLoss"),
    takeProfit: parseOptNum(formData, "takeProfit"),
    exitPrice: parseOptNum(formData, "exitPrice"),
    lotSize: parseOptNum(formData, "lotSize"),
    result: formData.get("result") || "PENDING",
    pnl: parseOptNum(formData, "pnl"),
    notes: (formData.get("notes") as string) || null,
    openedAt: formData.get("openedAt") || undefined,
    closedAt: formData.get("closedAt") || null,
  });

  const te = await getTranslations("errors");

  if (!parsed.success) return { error: te("journalInvalidData") };

  const d = parsed.data;
  const openedAt = d.openedAt ?? new Date();

  if (formData.get("confirmedOverLimit") !== "1") {
    const limit = await checkDailyTradeLimit(session.user.id, openedAt);
    if (limit) return { dailyLimitWarning: limit };
  }

  // Lệnh log với kết quả W/L/BE coi như đã đóng — cần closedAt cho loss-streak/edge stats
  const closedAt =
    d.closedAt ?? (d.result !== "PENDING" ? new Date() : null);
  await prisma.tradeJournal.create({
    data: {
      userId: session.user.id,
      symbol: d.symbol.toUpperCase(),
      direction: d.direction,
      entry: d.entry,
      stopLoss: d.stopLoss,
      takeProfit: d.takeProfit,
      exitPrice: d.exitPrice,
      lotSize: d.lotSize,
      result: d.result,
      pnl: d.pnl,
      notes: d.notes,
      openedAt,
      closedAt,
      setup: parseTradeSetup(formData.get("setup")),
      emotion: parseTradeEmotion(formData.get("emotion")),
      imageUrl: parseJournalImageUrl(formData.get("imageUrl")),
      copiedFromSignalId: (formData.get("copiedFromSignalId") as string) || null,
    },
  });

  if (d.result === "LOSS") await maybeNotifyLossStreak(session.user.id);

  try {
    await updateStreak(session.user.id, "journal");
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { streakJournal: true },
    });
    if (user) {
      await addXp(session.user.id, "journalCreate", user.streakJournal);
    }
  } catch {
    // Non-blocking
  }

  revalidateJournalPaths();
  return { ok: true };
}

export async function updateTrade(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const te = await getTranslations("errors");

  const tradeId = formData.get("tradeId") as string;
  if (!tradeId) return { error: te("missingTradeId") };

  const trade = await prisma.tradeJournal.findUnique({
    where: { id: tradeId },
  });
  if (!trade || trade.userId !== session.user.id) {
    return { error: te("journalForbidden") };
  }

  const parsed = tradeSchema.safeParse({
    symbol: formData.get("symbol"),
    direction: formData.get("direction"),
    entry: formData.get("entry"),
    stopLoss: parseOptNum(formData, "stopLoss"),
    takeProfit: parseOptNum(formData, "takeProfit"),
    exitPrice: parseOptNum(formData, "exitPrice"),
    lotSize: parseOptNum(formData, "lotSize"),
    result: formData.get("result") || "PENDING",
    pnl: parseOptNum(formData, "pnl"),
    notes: (formData.get("notes") as string) || null,
    openedAt: formData.get("openedAt") || undefined,
    closedAt: formData.get("closedAt") || null,
  });

  if (!parsed.success) return { error: te("journalInvalidData") };

  const d = parsed.data;
  const closedAt =
    d.closedAt ??
    (d.result !== "PENDING" ? trade.closedAt ?? new Date() : null);
  await prisma.tradeJournal.update({
    where: { id: tradeId },
    data: {
      symbol: d.symbol.toUpperCase(),
      direction: d.direction,
      entry: d.entry,
      stopLoss: d.stopLoss,
      takeProfit: d.takeProfit,
      exitPrice: d.exitPrice,
      lotSize: d.lotSize,
      result: d.result,
      pnl: d.pnl,
      notes: d.notes,
      openedAt: d.openedAt,
      closedAt,
      setup: parseTradeSetup(formData.get("setup")),
      emotion: parseTradeEmotion(formData.get("emotion")),
      imageUrl: parseJournalImageUrl(formData.get("imageUrl")),
    },
  });

  if (d.result === "LOSS" && trade.result !== "LOSS") {
    await maybeNotifyLossStreak(session.user.id);
  }

  revalidateJournalPaths();
  return { ok: true };
}

export async function deleteTrade(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const tradeId = formData.get("tradeId") as string;
  if (!tradeId) return;

  const trade = await prisma.tradeJournal.findUnique({
    where: { id: tradeId },
  });
  if (!trade || trade.userId !== session.user.id) return;

  await prisma.tradeJournal.delete({ where: { id: tradeId } });
  revalidateJournalPaths();
}

const emotionDiarySchema = z.object({
  date: z.coerce.date(),
  note: z.string().trim().min(1).max(4000),
});

export async function upsertEmotionDiaryEntry(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const te = await getTranslations("errors");

  const parsed = emotionDiarySchema.safeParse({
    date: formData.get("date"),
    note: formData.get("note"),
  });
  if (!parsed.success) return { error: te("journalInvalidData") };

  const day = new Date(parsed.data.date);
  day.setUTCHours(0, 0, 0, 0);

  await prisma.emotionDiaryEntry.upsert({
    where: { userId_date: { userId: session.user.id, date: day } },
    create: { userId: session.user.id, date: day, note: parsed.data.note },
    update: { note: parsed.data.note },
  });

  revalidateJournalPaths();
  return { ok: true };
}

export async function deleteEmotionDiaryEntry(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const id = formData.get("id") as string;
  if (!id) return;

  const entry = await prisma.emotionDiaryEntry.findUnique({ where: { id } });
  if (!entry || entry.userId !== session.user.id) return;

  await prisma.emotionDiaryEntry.delete({ where: { id } });
  revalidateJournalPaths();
}
