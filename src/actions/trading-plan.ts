"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseAndValidateImageUrls } from "@/lib/signal-images";
import { updateStreak } from "@/lib/streak";

const biasValues = ["BULLISH", "BEARISH", "RANGE", "WAIT"] as const;

const symbolPlanSchema = z.object({
  id: z.string().max(80).optional(),
  symbol: z.string().min(2).max(32),
  bias: z.enum(biasValues),
  keyLevels: z.string().max(1200).optional().nullable(),
  newsToAvoid: z.string().max(1200).optional().nullable(),
  notes: z.string().max(1200).optional().nullable(),
});

const planSchema = z.object({
  locale: z.enum(["vi", "en"]).default("vi"),
  planDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  watchedSymbols: z.string().max(300).optional().nullable(),
  symbolPlans: z.string().max(20000).optional().nullable(),
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

function parseLocale(formData: FormData) {
  return formData.get("locale") === "en" ? "en" : "vi";
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

function normalizeSymbol(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9._:-]/g, "");
}

function parseSymbolPlans(value: string | null | undefined) {
  if (!value) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(value);
  } catch {
    return null;
  }
  const parsed = z.array(symbolPlanSchema).max(12).safeParse(raw);
  if (!parsed.success) return null;

  const seen = new Set<string>();
  const plans = [];
  for (const item of parsed.data) {
    const symbol = normalizeSymbol(item.symbol);
    if (symbol.length < 2 || seen.has(symbol)) continue;
    seen.add(symbol);
    plans.push({
      id: item.id ?? symbol,
      symbol,
      bias: item.bias,
      keyLevels: textOrNull(item.keyLevels),
      newsToAvoid: textOrNull(item.newsToAvoid),
      notes: textOrNull(item.notes),
    });
  }
  return plans;
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
  const locale = parseLocale(formData);
  if (!session?.user?.id) {
    redirect(`/${locale}/auth/signin?callbackUrl=/${locale}/plan`);
  }

  const t = await getTranslations("tradingPlan");
  const parsed = planSchema.safeParse({
    locale,
    planDate: formData.get("planDate"),
    watchedSymbols: formData.get("watchedSymbols"),
    symbolPlans: formData.get("symbolPlans"),
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

  const imageCheck = parseAndValidateImageUrls(formData.getAll("imageUrls"));
  if (!imageCheck.ok) return { error: t("invalidImage") };

  const symbolPlans = parseSymbolPlans(parsed.data.symbolPlans);
  if (symbolPlans === null) return { error: t("invalidData") };
  const watchedSymbols =
    symbolPlans.length > 0
      ? symbolPlans.map((item) => item.symbol)
      : normalizeSymbols(parsed.data.watchedSymbols);

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
      watchedSymbols,
      symbolPlans,
      chartImageUrls: imageCheck.urls,
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
      watchedSymbols,
      symbolPlans,
      chartImageUrls: imageCheck.urls,
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

  try {
    await updateStreak(session.user.id, "plan");
  } catch {
    // Non-blocking
  }

  revalidatePath(`/${parsed.data.locale}/plan`);
  revalidatePath(`/${parsed.data.locale}/dashboard`);
  return { ok: true };
}
