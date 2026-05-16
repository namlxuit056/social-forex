import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { rateLimit } from "@/lib/rate-limit";
import { resolveQuotes } from "@/lib/quotes/resolve-quotes";
import { QUOTE_BY_SYMBOL } from "@/lib/quotes/definitions";
import { getAiSuggestion, AiUnavailableError } from "@/lib/ai/suggest";
import { getTradingViewTechnicalContext } from "@/lib/ai/tradingview-context";
import { getAiNewsContext } from "@/lib/ai/news-context";
import type { AiSuggestResponse, AiSuggestError } from "@/lib/ai/types";
import { localeFromRequest } from "@/lib/api-locale";
import { pickAi } from "@/lib/messages-pick";

const DEFAULT_SYMBOL = "EURUSD";

function errorJson(
  error: string,
  status: number,
  retryAfterMs?: number,
) {
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

  const body = (await req.json().catch(() => ({}))) as { symbol?: string };
  const symbol = (body.symbol ?? DEFAULT_SYMBOL).toUpperCase();

  if (!QUOTE_BY_SYMBOL[symbol]) {
    return errorJson(ai.apiSymbolUnsupported, 400);
  }

  let isVip = false;
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { vipUntil: true },
    });
    isVip = isVipActive(user?.vipUntil);
  }

  const rateLimitKey = userId
    ? `ai:${userId}`
    : `ai:anon:${req.headers.get("x-forwarded-for") ?? "unknown"}`;
  const maxReq = isVip ? 3 : 1;
  const windowMs = isVip ? 60_000 : 300_000;
  const { ok, remaining } = rateLimit(rateLimitKey, maxReq, windowMs);

  if (!ok) {
    const retryAfterMs = remaining === 0 ? windowMs : undefined;
    return errorJson(
      isVip ? ai.apiRateLimitVip : ai.apiRateLimitFree,
      429,
      retryAfterMs,
    );
  }

  const { quotes } = await resolveQuotes();
  const quote = quotes.find((q) => q.symbol === symbol);
  if (!quote) {
    return errorJson(ai.apiNoQuote, 404);
  }

  try {
    const technicalContext = await getTradingViewTechnicalContext(quote).catch(
      () => null,
    );
    const newsContext = await getAiNewsContext(symbol).catch(() => null);
    const suggestion = await getAiSuggestion(
      quote,
      technicalContext,
      newsContext,
      loc,
    );

    const response: AiSuggestResponse = {
      symbol,
      suggestion,
      ...(technicalContext ? { technicalContext } : {}),
      ...(newsContext ? { newsContext } : {}),
      generatedAt: new Date().toISOString(),
      disclaimer: ai.apiDisclaimer,
    };

    return NextResponse.json(response);
  } catch (e) {
    if (e instanceof AiUnavailableError) {
      return errorJson(e.message, 503);
    }
    const msg = e instanceof Error ? e.message : ai.apiUnknownError;
    return errorJson(ai.apiAnalyzeFailed.replace("{message}", msg), 500);
  }
}
