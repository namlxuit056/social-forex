import type { AppLocale } from "@/lib/api-locale";
import {
  AI_DAILY_TREND_CACHE_SCHEMA_VERSION,
  AI_DAILY_TREND_CACHE_TTL_MS,
  aiDailyTrendSchema,
  type AiDailyTrend,
} from "@/lib/ai/trend";

type CachedAiDailyTrend = {
  trend: AiDailyTrend;
  generatedAt: Date;
};

async function getPrisma() {
  try {
    const mod = await import("@/lib/prisma");
    return mod.prisma;
  } catch {
    return null;
  }
}

export async function getCachedAiDailyTrend(
  symbol: string,
  locale: AppLocale,
): Promise<CachedAiDailyTrend | null> {
  const prisma = await getPrisma();
  if (!prisma) return null;

  try {
    const row = await prisma.aiTrendCache.findUnique({
      where: {
        symbol_locale_schemaVersion: {
          symbol,
          locale,
          schemaVersion: AI_DAILY_TREND_CACHE_SCHEMA_VERSION,
        },
      },
      select: {
        trend: true,
        generatedAt: true,
        expiresAt: true,
      },
    });

    if (!row || row.expiresAt.getTime() <= Date.now()) return null;

    const parsed = aiDailyTrendSchema.safeParse(row.trend);
    if (!parsed.success) return null;

    return {
      trend: parsed.data,
      generatedAt: row.generatedAt,
    };
  } catch {
    return null;
  }
}

export async function setCachedAiDailyTrend(params: {
  symbol: string;
  locale: AppLocale;
  trend: AiDailyTrend;
  generatedAt?: Date;
}): Promise<void> {
  const prisma = await getPrisma();
  if (!prisma) return;

  const generatedAt = params.generatedAt ?? new Date();
  const expiresAt = new Date(generatedAt.getTime() + AI_DAILY_TREND_CACHE_TTL_MS);

  try {
    await prisma.aiTrendCache.upsert({
      where: {
        symbol_locale_schemaVersion: {
          symbol: params.symbol,
          locale: params.locale,
          schemaVersion: AI_DAILY_TREND_CACHE_SCHEMA_VERSION,
        },
      },
      create: {
        symbol: params.symbol,
        locale: params.locale,
        schemaVersion: AI_DAILY_TREND_CACHE_SCHEMA_VERSION,
        trend: params.trend,
        generatedAt,
        expiresAt,
      },
      update: {
        trend: params.trend,
        generatedAt,
        expiresAt,
      },
    });
  } catch {
    // DB cache is an optimization; never fail the AI trend endpoint because of it.
  }
}
