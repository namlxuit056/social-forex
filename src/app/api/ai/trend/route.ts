import { NextRequest, NextResponse } from "next/server";
import { localeFromRequest } from "@/lib/api-locale";
import { getAiDailyTrend, AiTrendUnavailableError } from "@/lib/ai/trend";
import type { AiSuggestError } from "@/lib/ai/types";
import { getTradingViewTechnicalContext } from "@/lib/ai/tradingview-context";
import { pickAi } from "@/lib/messages-pick";
import { QUOTE_BY_SYMBOL } from "@/lib/quotes/definitions";
import { resolveQuotes } from "@/lib/quotes/resolve-quotes";
import { rateLimit } from "@/lib/rate-limit";

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

  const body = (await req.json().catch(() => ({}))) as { symbol?: string };
  const symbol = (body.symbol ?? "").toUpperCase();

  if (!QUOTE_BY_SYMBOL[symbol]) {
    return errorJson(ai.apiSymbolUnsupported, 400);
  }

  const rateLimitKey = `ai-trend:${req.headers.get("x-forwarded-for") ?? "unknown"}`;
  const windowMs = 5 * 60_000;
  const { ok, remaining } = rateLimit(rateLimitKey, 60, windowMs);
  if (!ok) {
    return errorJson(ai.apiRateLimitFree, 429, remaining === 0 ? windowMs : undefined);
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
    const trend = await getAiDailyTrend(quote, technicalContext, loc);

    return NextResponse.json({
      symbol,
      trend,
      generatedAt: new Date().toISOString(),
      disclaimer: ai.apiDisclaimer,
    });
  } catch (e) {
    if (e instanceof AiTrendUnavailableError) {
      return errorJson(e.message, 503);
    }
    const message = e instanceof Error ? e.message : ai.apiUnknownError;
    return errorJson(ai.apiAnalyzeFailed.replace("{message}", message), 500);
  }
}
