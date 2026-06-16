"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const biasValues = ["BULLISH", "BEARISH", "RANGE", "WAIT"] as const;

const planSchema = z.object({
  planDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  watchedSymbols: z.string().max(300).optional().nullable(),
  bias: z.enum(biasValues),
  keyLevels: z.string().max(2000).optional().nullable(),
  newsToAvoid: z.string().max(2000).optional().nullable(),
  maxRiskPercent: z.coerce.number().min(0).max(100).optional().nullable(),
  maxTrades: z.coerce.number().int().min(1).max(99).optional().nullable(),
  sessionFocus: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  checkedNews: z.boolean(),
  checkedLevels: z.boolean(),
  checkedRisk: z.boolean(),
  checkedEmotion: z.boolean(),
  checkedJournal: z.boolean(),
});

function parseOptionalNumber(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === null || value === "" ? null : value;
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    !Number.isFinite(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function normalizeSymbols(value: string | null | undefined) {
  if (!value) return [];
  const seen = new Set<string>();
  const symbols: string[] = [];
  for (const raw of value.split(/[\s,;]+/)) {
    const symbol = raw.trim().toUpperCase().replace(/[^A-Z0-9._:-]/g, "");
    if (symbol.length < 2 || symbol.length > 32 || seen.has(symbol)) continue;
    seen.add(symbol);
    symbols.push(symbol);
    if (symbols.length >= 12) break;
  }
  return symbols;
}

function textOrNull(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function saveDailyTradingPlan(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const t = await getTranslations("tradingPlan");
  const parsed = planSchema.safeParse({
    planDate: formData.get("planDate"),
    watchedSymbols: formData.get("watchedSymbols"),
    bias: formData.get("bias") || "WAIT",
    keyLevels: formData.get("keyLevels"),
    newsToAvoid: formData.get("newsToAvoid"),
    maxRiskPercent: parseOptionalNumber(formData, "maxRiskPercent"),
    maxTrades: parseOptionalNumber(formData, "maxTrades"),
    sessionFocus: formData.get("sessionFocus"),
    notes: formData.get("notes"),
    checkedNews: formData.get("checkedNews") === "on",
    checkedLevels: formData.get("checkedLevels") === "on",
    checkedRisk: formData.get("checkedRisk") === "on",
    checkedEmotion: formData.get("checkedEmotion") === "on",
    checkedJournal: formData.get("checkedJournal") === "on",
  });

  if (!parsed.success) return { error: t("invalidData") };

  const planDate = parseDateOnly(parsed.data.planDate);
  if (!planDate) return { error: t("invalidData") };

  const completed =
    parsed.data.checkedNews &&
    parsed.data.checkedLevels &&
    parsed.data.checkedRisk &&
    parsed.data.checkedEmotion &&
    parsed.data.checkedJournal;

  await prisma.dailyTradingPlan.upsert({
    where: {
      userId_planDate: {
        userId: session.user.id,
        planDate,
      },
    },
    create: {
      userId: session.user.id,
      planDate,
      watchedSymbols: normalizeSymbols(parsed.data.watchedSymbols),
      bias: parsed.data.bias,
      keyLevels: textOrNull(parsed.data.keyLevels),
      newsToAvoid: textOrNull(parsed.data.newsToAvoid),
      maxRiskPercent: parsed.data.maxRiskPercent,
      maxTrades: parsed.data.maxTrades,
      sessionFocus: textOrNull(parsed.data.sessionFocus),
      notes: textOrNull(parsed.data.notes),
      checkedNews: parsed.data.checkedNews,
      checkedLevels: parsed.data.checkedLevels,
      checkedRisk: parsed.data.checkedRisk,
      checkedEmotion: parsed.data.checkedEmotion,
      checkedJournal: parsed.data.checkedJournal,
      completedAt: completed ? new Date() : null,
    },
    update: {
      watchedSymbols: normalizeSymbols(parsed.data.watchedSymbols),
      bias: parsed.data.bias,
      keyLevels: textOrNull(parsed.data.keyLevels),
      newsToAvoid: textOrNull(parsed.data.newsToAvoid),
      maxRiskPercent: parsed.data.maxRiskPercent,
      maxTrades: parsed.data.maxTrades,
      sessionFocus: textOrNull(parsed.data.sessionFocus),
      notes: textOrNull(parsed.data.notes),
      checkedNews: parsed.data.checkedNews,
      checkedLevels: parsed.data.checkedLevels,
      checkedRisk: parsed.data.checkedRisk,
      checkedEmotion: parsed.data.checkedEmotion,
      checkedJournal: parsed.data.checkedJournal,
      completedAt: completed ? new Date() : null,
    },
  });

  revalidatePath("/plan");
  revalidatePath("/dashboard");
  return { ok: true };
}
