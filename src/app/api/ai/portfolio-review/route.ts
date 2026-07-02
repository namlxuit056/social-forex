import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  AiPortfolioReviewUnavailableError,
  getAiPortfolioReview,
} from "@/lib/ai/portfolio-review";
import type { AiPortfolioReviewResponse, AiSuggestError } from "@/lib/ai/types";
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
    !!process.env.OPENAI_API_KEY?.trim() ||
    !!process.env.DEEPSEEK_API_KEY?.trim();
  if (!hasAiKey) {
    return errorJson(ai.apiNotConfigured, 503);
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return errorJson(ai.apiPortfolioLoginRequired, 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { vipUntil: true },
  });
  const isVip = isVipActive(user?.vipUntil);

  const rateLimitKey = `ai-portfolio:${userId}`;
  const maxReq = isVip ? 4 : 1;
  const windowMs = isVip ? 5 * 60_000 : 15 * 60_000;
  const { ok, remaining } = rateLimit(rateLimitKey, maxReq, windowMs);
  if (!ok) {
    return errorJson(
      isVip ? ai.apiPortfolioRateLimitVip : ai.apiPortfolioRateLimitFree,
      429,
      remaining === 0 ? windowMs : undefined,
    );
  }

  const connection = await prisma.mt5Connection.findFirst({
    where: { userId, revokedAt: null },
    orderBy: { lastSeenAt: "desc" },
    select: {
      balance: true,
      equity: true,
      margin: true,
      freeMargin: true,
      accountCurrency: true,
      lastPositions: true,
    },
  });

  if (!connection) {
    return errorJson(ai.apiPortfolioNoConnection, 400);
  }

  const positions: Array<{
    ticket: string;
    symbol: string;
    type: string;
    volume: number | null;
    priceOpen: number | null;
    priceCurrent: number | null;
    stopLoss: number | null;
    takeProfit: number | null;
    profit: number | null;
  }> = [];
  if (Array.isArray(connection.lastPositions)) {
    for (const p of connection.lastPositions as Record<string, unknown>[]) {
      const ticket = p.ticket != null ? String(p.ticket) : null;
      const symbol = typeof p.symbol === "string" ? p.symbol : null;
      const type = typeof p.type === "string" ? p.type : null;
      if (!ticket || !symbol || !type) continue;
      const num = (v: unknown) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };
      positions.push({
        ticket,
        symbol,
        type,
        volume: num(p.volume),
        priceOpen: num(p.priceOpen),
        priceCurrent: num(p.priceCurrent),
        stopLoss: num(p.stopLoss),
        takeProfit: num(p.takeProfit),
        profit: num(p.profit),
      });
    }
  }

  if (positions.length === 0) {
    return errorJson(ai.apiPortfolioNoPositions, 400);
  }

  try {
    const review = await getAiPortfolioReview({
      account: {
        balance: connection.balance,
        equity: connection.equity,
        margin: connection.margin,
        freeMargin: connection.freeMargin,
        currency: connection.accountCurrency,
      },
      positions,
      locale: loc,
    });

    const response: AiPortfolioReviewResponse = {
      review,
      generatedAt: new Date().toISOString(),
      positionCount: positions.length,
      disclaimer: ai.apiDisclaimer,
    };

    return NextResponse.json(response);
  } catch (e) {
    if (e instanceof AiPortfolioReviewUnavailableError) {
      return errorJson(e.message, 503);
    }
    const msg = e instanceof Error ? e.message : ai.apiUnknownError;
    return errorJson(ai.apiAnalyzeFailed.replace("{message}", msg), 500);
  }
}
