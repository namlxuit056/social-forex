import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  AiJournalAnalysisUnavailableError,
  getAiJournalAnalysis,
} from "@/lib/ai/journal-analysis";
import type {
  AiJournalAnalysisResponse,
  AiSuggestError,
} from "@/lib/ai/types";
import { localeFromRequest } from "@/lib/api-locale";
import { pickAi } from "@/lib/messages-pick";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { isVipActive } from "@/lib/vip";

function errorJson(error: string, status: number, retryAfterMs?: number) {
  const body: AiSuggestError = { error, retryAfterMs };
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  const loc = localeFromRequest(req);
  const ai = pickAi(loc);

  const hasAiKey =
    !!process.env.GROQ_API_KEY?.trim() ||
    !!process.env.OPENAI_API_KEY?.trim();
  if (!hasAiKey) {
    return errorJson(ai.apiNotConfigured, 503);
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return errorJson(ai.apiJournalLoginRequired, 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { vipUntil: true },
  });
  const isVip = isVipActive(user?.vipUntil);

  const rateLimitKey = `ai-journal:${userId}`;
  const maxReq = isVip ? 4 : 1;
  const windowMs = isVip ? 5 * 60_000 : 15 * 60_000;
  const { ok, remaining } = rateLimit(rateLimitKey, maxReq, windowMs);
  if (!ok) {
    return errorJson(
      isVip ? ai.apiJournalRateLimitVip : ai.apiJournalRateLimitFree,
      429,
      remaining === 0 ? windowMs : undefined,
    );
  }

  const trades = await prisma.tradeJournal.findMany({
    where: { userId },
    orderBy: { openedAt: "desc" },
    take: 200,
    select: {
      symbol: true,
      direction: true,
      entry: true,
      stopLoss: true,
      takeProfit: true,
      exitPrice: true,
      lotSize: true,
      result: true,
      pnl: true,
      notes: true,
      openedAt: true,
      closedAt: true,
    },
  });

  if (trades.length === 0) {
    return errorJson(ai.apiJournalNoTrades, 400);
  }

  try {
    const analysis = await getAiJournalAnalysis({ trades, locale: loc });
    const response: AiJournalAnalysisResponse = {
      analysis,
      generatedAt: new Date().toISOString(),
      tradeCount: trades.length,
      closedTradeCount: trades.filter((trade) => trade.result !== "PENDING").length,
      disclaimer: ai.apiDisclaimer,
    };

    return NextResponse.json(response);
  } catch (e) {
    if (e instanceof AiJournalAnalysisUnavailableError) {
      return errorJson(e.message, 503);
    }
    const msg = e instanceof Error ? e.message : ai.apiUnknownError;
    return errorJson(ai.apiAnalyzeFailed.replace("{message}", msg), 500);
  }
}
