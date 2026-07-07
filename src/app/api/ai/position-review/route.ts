import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { rateLimit } from "@/lib/rate-limit";
import {
  AiPositionReviewUnavailableError,
  getAiPositionReview,
  type OpenPositionForReview,
} from "@/lib/ai/position-review";
import type { AiPositionReviewResponse, AiSuggestError } from "@/lib/ai/types";
import { localeFromRequest } from "@/lib/api-locale";
import { pickAi } from "@/lib/messages-pick";

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
    return errorJson(ai.apiPositionLoginRequired, 401);
  }

  const body = (await req.json().catch(() => ({}))) as { ticket?: string };
  const ticket = body.ticket?.trim();
  if (!ticket) {
    return errorJson(ai.apiPositionNotFound, 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { vipUntil: true },
  });
  const isVip = isVipActive(user?.vipUntil);

  const rateLimitKey = `ai-position:${userId}`;
  const maxReq = isVip ? 3 : 1;
  const windowMs = isVip ? 60_000 : 300_000;
  const { ok, remaining } = rateLimit(rateLimitKey, maxReq, windowMs);
  if (!ok) {
    return errorJson(
      isVip ? ai.apiRateLimitVip : ai.apiRateLimitFree,
      429,
      remaining === 0 ? windowMs : undefined,
    );
  }

  const connection = await prisma.mt5Connection.findFirst({
    where: { userId, revokedAt: null },
    orderBy: { lastSeenAt: "desc" },
    select: { lastPositions: true },
  });
  if (!connection) {
    return errorJson(ai.apiPositionNoConnection, 400);
  }

  let position: OpenPositionForReview | null = null;
  if (Array.isArray(connection.lastPositions)) {
    for (const p of connection.lastPositions as Record<string, unknown>[]) {
      if (String(p.ticket ?? "") !== ticket) continue;
      const symbol = typeof p.symbol === "string" ? p.symbol : null;
      const type = typeof p.type === "string" ? p.type : null;
      if (!symbol || !type) continue;
      const num = (v: unknown) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };
      position = {
        ticket,
        symbol,
        isBuy: type.toUpperCase().startsWith("BUY"),
        volume: num(p.volume),
        entry: num(p.priceOpen),
        current: num(p.priceCurrent),
        stopLoss: num(p.stopLoss),
        takeProfit: num(p.takeProfit),
        floatingPnl: num(p.profit),
      };
      break;
    }
  }
  if (!position) {
    return errorJson(ai.apiPositionNotFound, 404);
  }

  try {
    const { review, tvContext } = await getAiPositionReview({ position, locale: loc });

    const response: AiPositionReviewResponse = {
      review,
      ...(tvContext ? { technicalContext: tvContext } : {}),
      generatedAt: new Date().toISOString(),
      disclaimer: ai.apiDisclaimer,
    };

    return NextResponse.json(response);
  } catch (e) {
    if (e instanceof AiPositionReviewUnavailableError) {
      return errorJson(e.message, 503);
    }
    const msg = e instanceof Error ? e.message : ai.apiUnknownError;
    return errorJson(ai.apiAnalyzeFailed.replace("{message}", msg), 500);
  }
}
