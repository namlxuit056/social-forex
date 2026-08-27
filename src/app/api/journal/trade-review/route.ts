import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { rateLimit } from "@/lib/rate-limit";
import { localeFromRequest } from "@/lib/api-locale";
import { pickAi } from "@/lib/messages-pick";
import { countTrailingLosses } from "@/lib/journal/loss-streak";
import { utcDayRange } from "@/lib/journal/daily-limit";
import { computeEdgeGroups, findBestRow, type EdgeTrade } from "@/lib/journal/edge-stats";
import { parseTradeSetup } from "@/lib/journal/setups";
import {
  AiTradeReviewUnavailableError,
  buildTradeReviewContext,
  getAiTradeReview,
  type BestSetupForReview,
  type DayPlanForReview,
} from "@/lib/ai/trade-review";
import type {
  AiSuggestError,
  AiTradeReviewResponse,
  AiTradeReviewResult,
} from "@/lib/ai/types";

function errorJson(error: string, status: number, retryAfterMs?: number) {
  const body: AiSuggestError = { error, retryAfterMs };
  return NextResponse.json(body, { status });
}

const CLOSED_RESULTS = new Set(["WIN", "LOSS", "BREAKEVEN"]);

export async function POST(req: NextRequest) {
  const loc = localeFromRequest(req);
  const ai = pickAi(loc);

  const hasAiKey =
    !!process.env.GROQ_API_KEY?.trim() ||
    !!process.env.OPENAI_API_KEY?.trim() ||
    !!process.env.DEEPSEEK_API_KEY?.trim() ||
    !!process.env.ANTHROPIC_API_KEY?.trim();
  if (!hasAiKey) return errorJson(ai.apiNotConfigured, 503);

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return errorJson(ai.apiJournalLoginRequired, 401);

  const body = (await req.json().catch(() => ({}))) as {
    tradeId?: string;
    refresh?: boolean;
  };
  const tradeId = body.tradeId?.trim();
  if (!tradeId) return errorJson(ai.apiTradeReviewNotFound, 400);

  const trade = await prisma.tradeJournal.findUnique({ where: { id: tradeId } });
  if (!trade || trade.userId !== userId) {
    return errorJson(ai.apiTradeReviewNotFound, 404);
  }
  if (!CLOSED_RESULTS.has(trade.result)) {
    return errorJson(ai.apiTradeReviewPending, 400);
  }

  const existing = await prisma.aiTradeReview.findUnique({
    where: { tradeId },
    select: { review: true, createdAt: true },
  });
  if (existing && !body.refresh) {
    const response: AiTradeReviewResponse = {
      review: existing.review as AiTradeReviewResult,
      cached: true,
      generatedAt: existing.createdAt.toISOString(),
      disclaimer: ai.apiDisclaimer,
    };
    return NextResponse.json(response);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { vipUntil: true },
  });
  const isVip = isVipActive(user?.vipUntil);

  const { ok, remaining } = rateLimit(
    `ai-trade-review:${userId}`,
    isVip ? 5 : 2,
    isVip ? 60_000 : 300_000,
  );
  if (!ok) {
    return errorJson(
      isVip ? ai.apiRateLimitVip : ai.apiRateLimitFree,
      429,
      remaining === 0 ? (isVip ? 60_000 : 300_000) : undefined,
    );
  }

  const { start, end } = utcDayRange(trade.openedAt);
  const closedAt = trade.closedAt ?? new Date();

  const [planRow, tradesLoggedThatDay, priorClosed, recentTrades, moodRow] = await Promise.all([
    prisma.dailyTradingPlan.findUnique({
      where: { userId_planDate: { userId, planDate: start } },
      select: {
        maxTrades: true,
        bias: true,
        keyLevels: true,
        newsToAvoid: true,
        checkedNews: true,
        checkedLevels: true,
        checkedRisk: true,
        checkedEmotion: true,
        checkedJournal: true,
      },
    }),
    prisma.tradeJournal.count({
      where: { userId, openedAt: { gte: start, lt: end } },
    }),
    prisma.tradeJournal.findMany({
      where: {
        userId,
        closedAt: { not: null, lt: closedAt },
        result: { in: ["WIN", "LOSS", "BREAKEVEN"] },
      },
      orderBy: { closedAt: "desc" },
      take: 10,
      select: { result: true, closedAt: true },
    }),
    prisma.tradeJournal.findMany({
      where: { userId },
      orderBy: { openedAt: "desc" },
      take: 500,
      select: {
        symbol: true,
        direction: true,
        result: true,
        pnl: true,
        openedAt: true,
        copiedFromSignalId: true,
        setup: true,
        emotion: true,
      },
    }),
    prisma.moodCheckin.findUnique({
      where: { userId_day: { userId, day: start } },
      select: { mood: true },
    }),
  ]);

  const plan: DayPlanForReview = planRow
    ? {
        maxTrades: planRow.maxTrades,
        tradesLoggedThatDay,
        bias: planRow.bias,
        keyLevels: planRow.keyLevels,
        newsToAvoid: planRow.newsToAvoid,
        checklistDone: [
          planRow.checkedNews,
          planRow.checkedLevels,
          planRow.checkedRisk,
          planRow.checkedEmotion,
          planRow.checkedJournal,
        ].filter(Boolean).length,
        checklistTotal: 5,
      }
    : null;

  const edgeTrades: EdgeTrade[] = recentTrades.map((t) => ({
    symbol: t.symbol,
    direction: t.direction,
    result: t.result,
    pnl: t.pnl,
    openedAt: t.openedAt.toISOString(),
    copiedFromSignalId: t.copiedFromSignalId,
    setup: t.setup,
    emotion: t.emotion,
  }));
  const bestRow = findBestRow(computeEdgeGroups(edgeTrades).setups);
  const bestSetupKey = bestRow ? parseTradeSetup(bestRow.key) : null;
  const bestSetup: BestSetupForReview =
    bestRow && bestSetupKey
      ? {
          setup: bestSetupKey,
          winRate: bestRow.winRate ?? 0,
          total: bestRow.wins + bestRow.losses,
        }
      : null;

  const priorLossStreak = countTrailingLosses(priorClosed, closedAt);

  const context = buildTradeReviewContext({
    trade: {
      symbol: trade.symbol,
      direction: trade.direction,
      entry: trade.entry,
      stopLoss: trade.stopLoss,
      takeProfit: trade.takeProfit,
      exitPrice: trade.exitPrice,
      lotSize: trade.lotSize,
      result: trade.result,
      pnl: trade.pnl,
      notes: trade.notes,
      setup: trade.setup,
      emotion: trade.emotion,
      openedAt: trade.openedAt,
      closedAt: trade.closedAt,
      overrodeDailyLimit: trade.overrodeDailyLimit,
      overrodeLossStreakGuard: trade.overrodeLossStreakGuard,
    },
    plan,
    bestSetup,
    priorLossStreak,
    dayMood: moodRow?.mood ?? null,
  });

  try {
    const review = await getAiTradeReview({ context, locale: loc });

    await prisma.aiTradeReview.upsert({
      where: { tradeId },
      create: { userId, tradeId, review, locale: loc },
      update: { review, locale: loc },
    });

    const response: AiTradeReviewResponse = {
      review,
      cached: false,
      generatedAt: new Date().toISOString(),
      disclaimer: ai.apiDisclaimer,
    };
    return NextResponse.json(response);
  } catch (e) {
    if (e instanceof AiTradeReviewUnavailableError) {
      return errorJson(e.message, 503);
    }
    const msg = e instanceof Error ? e.message : ai.apiUnknownError;
    return errorJson(ai.apiAnalyzeFailed.replace("{message}", msg), 500);
  }
}
