import { type NextRequest, NextResponse } from "next/server";
import { resolveQuotes } from "@/lib/quotes/resolve-quotes";
import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";
import { getScalpingTechnicalContext } from "@/lib/ai/scalping-tradingview-context";
import { getScalpingAiSuggestion } from "@/lib/ai/scalping-suggest";
import { AiUnavailableError } from "@/lib/ai/suggest";
import { getAiNewsContext } from "@/lib/ai/news-context";
import type { AppLocale } from "@/lib/api-locale";

export const runtime = "nodejs";

export type ScalpingAnalysisResult = {
  symbol: string;
  name: string;
  price: number;
  bid: number;
  ask: number;
  spreadPips: number | null;
  changePercent: number;
  direction: "LONG" | "SHORT";
  qualityScore: number;
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  reasoning: string;
  checklist: Array<{ label: string; status: "pass" | "warn" | "fail"; detail: string }>;
  alignedTimeframes: string[];
  keyLevels?: { support: number; resistance: number };
  generatedAt: string;
};

export type ScalpingAnalysisError = {
  error: "ai_unavailable" | "symbol_not_found" | "internal_error";
};

function calcSpreadPips(symbol: string, bid: number, ask: number): number | null {
  if (bid >= 100) return null; // metals/crypto — not pip-based
  const isJpy = symbol.includes("JPY");
  const pipSize = isJpy ? 0.01 : 0.0001;
  return parseFloat(((ask - bid) / pipSize).toFixed(1));
}

function getAlignedTimeframes(
  frames: Array<{ timeframe: string; trend: string }>,
  direction: "LONG" | "SHORT",
): string[] {
  return frames
    .filter((f) => (direction === "LONG" ? f.trend === "bullish" : f.trend === "bearish"))
    .map((f) => f.timeframe);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const symbol = request.nextUrl.searchParams.get("symbol")?.toUpperCase();
  const locale = (request.nextUrl.searchParams.get("locale") ?? "vi") as AppLocale;

  if (!symbol) {
    return NextResponse.json(
      { error: "symbol_not_found" } satisfies ScalpingAnalysisError,
      { status: 400 },
    );
  }

  const def = QUOTE_DEFINITIONS.find((d) => d.symbol === symbol);
  if (!def) {
    return NextResponse.json(
      { error: "symbol_not_found" } satisfies ScalpingAnalysisError,
      { status: 404 },
    );
  }

  try {
    const quotesResponse = await resolveQuotes();
    const liveQuote = quotesResponse.quotes.find((q) => q.symbol === symbol);

    const quote = liveQuote
      ? { symbol: liveQuote.symbol, name: liveQuote.name, group: liveQuote.group, bid: liveQuote.bid, ask: liveQuote.ask, changePct: liveQuote.changePct }
      : { symbol: def.symbol, name: def.name, group: def.group, bid: def.mockMid, ask: def.mockMid, changePct: 0 };

    const [scalpingContext, newsResult] = await Promise.allSettled([
      getScalpingTechnicalContext(quote),
      getAiNewsContext(quote.symbol),
    ]);

    const tvContext = scalpingContext.status === "fulfilled" ? scalpingContext.value : null;
    const newsContext = newsResult.status === "fulfilled" ? newsResult.value : null;

    const ai = await getScalpingAiSuggestion(quote, tvContext, newsContext, locale);

    const result: ScalpingAnalysisResult = {
      symbol: quote.symbol,
      name: quote.name,
      price: (quote.bid + quote.ask) / 2,
      bid: quote.bid,
      ask: quote.ask,
      spreadPips: calcSpreadPips(quote.symbol, quote.bid, quote.ask),
      changePercent: quote.changePct,
      direction: ai.direction,
      qualityScore: ai.qualityScore,
      confidence: ai.confidence,
      entry: ai.entry,
      stopLoss: ai.stopLoss,
      takeProfit: ai.takeProfit,
      reasoning: ai.reasoning,
      checklist: ai.tradeChecklist,
      alignedTimeframes: tvContext
        ? getAlignedTimeframes(tvContext.frames, ai.direction)
        : [],
      keyLevels: ai.keyLevels,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AiUnavailableError) {
      return NextResponse.json(
        { error: "ai_unavailable" } satisfies ScalpingAnalysisError,
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "internal_error" } satisfies ScalpingAnalysisError,
      { status: 500 },
    );
  }
}
