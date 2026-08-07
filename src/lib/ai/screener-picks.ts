import { resolveQuotes } from "@/lib/quotes/resolve-quotes";
import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";
import { getTradingViewTechnicalContext } from "@/lib/ai/tradingview-context";
import { getAiSuggestion, AiUnavailableError } from "@/lib/ai/suggest";
import type { QuoteRow } from "@/lib/quotes/types";
import type { AppLocale } from "@/lib/api-locale";

export type AiPickResult = {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  direction: "LONG" | "SHORT";
  qualityScore: number;
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  reasoning: string;
  checklist: Array<{ label: string; status: "pass" | "warn" | "fail"; detail: string }>;
  alignmentCount: number;
  alignedTimeframes: string[];
};

export type AiPicksResponse = {
  picks: AiPickResult[];
  generatedAt: string;
};

const MAX_PICKS = 3;
const CACHE_TTL = 5 * 60_000;
const cacheByLocale = new Map<string, { at: number; data: AiPicksResponse }>();

function scoreAlignment(recs: { M15: number | null; H1: number | null; H4: number | null; D1: number | null }): {
  score: number;
  direction: "LONG" | "SHORT" | null;
  alignedTimeframes: string[];
} {
  const d1 = recs.D1;
  // D1 must have a clear directional bias
  if (d1 === null || Math.abs(d1) < 0.1) {
    return { score: 0, direction: null, alignedTimeframes: [] };
  }

  const isBull = d1 >= 0.1;
  const all: Array<[string, number | null]> = [
    ["M15", recs.M15],
    ["H1", recs.H1],
    ["H4", recs.H4],
    ["D1", recs.D1],
  ];

  const aligned = all
    .filter(([, v]) => v !== null && (isBull ? v >= 0.1 : v <= -0.1))
    .map(([tf]) => tf);

  // Need D1 + at least 2 other timeframes aligned
  if (aligned.length < 3) {
    return { score: 0, direction: null, alignedTimeframes: [] };
  }

  return {
    score: aligned.length,
    direction: isBull ? "LONG" : "SHORT",
    alignedTimeframes: aligned,
  };
}

/** Shared by the /screener AI-picks UI and the screener auto-fire cron — keeps the
 * multi-timeframe alignment scan + per-symbol AI call in one place with one cache. */
export async function getScreenerAiPicks(locale: AppLocale): Promise<AiPicksResponse> {
  const cacheKey = locale;
  const cached = cacheByLocale.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return cached.data;
  }

  const quotesResponse = await resolveQuotes();
  const quoteRows: QuoteRow[] = quotesResponse.quotes.map((q) => ({
    symbol: q.symbol,
    name: q.name,
    group: q.group,
    bid: q.bid,
    ask: q.ask,
    changePct: q.changePct,
  }));

  // Fetch TV context for all pairs in parallel (reuses TV cache)
  const tvResults = await Promise.allSettled(
    QUOTE_DEFINITIONS.map((def) => {
      const quote = quoteRows.find((q) => q.symbol === def.symbol);
      return quote ? getTradingViewTechnicalContext(quote) : Promise.resolve(null);
    }),
  );

  // Score alignment for each pair
  const scored = QUOTE_DEFINITIONS.map((def, i) => {
    const tv = tvResults[i].status === "fulfilled" ? tvResults[i].value : null;
    const quote = quoteRows.find((q) => q.symbol === def.symbol);

    const recs = {
      M15: tv?.frames.find((f) => f.timeframe === "M15")?.recommendation ?? null,
      H1: tv?.frames.find((f) => f.timeframe === "H1")?.recommendation ?? null,
      H4: tv?.frames.find((f) => f.timeframe === "H4")?.recommendation ?? null,
      D1: tv?.frames.find((f) => f.timeframe === "D1")?.recommendation ?? null,
    };

    const { score, direction, alignedTimeframes } = scoreAlignment(recs);
    const price = quote ? (quote.bid + quote.ask) / 2 : def.mockMid;

    return { def, quote, tv, score, direction, alignedTimeframes, price };
  });

  // Pick top candidates: must have alignment and a live quote
  const candidates = scored
    .filter((s) => s.score >= 3 && s.direction !== null && s.quote)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PICKS);

  if (candidates.length === 0) {
    const result: AiPicksResponse = { picks: [], generatedAt: new Date().toISOString() };
    cacheByLocale.set(cacheKey, { at: Date.now(), data: result });
    return result;
  }

  // Run AI suggestion for each candidate in parallel
  const aiResults = await Promise.allSettled(
    candidates.map(({ quote, tv }) => getAiSuggestion(quote!, tv, null, locale)),
  );

  const picks: AiPickResult[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const aiResult = aiResults[i];
    if (aiResult.status === "rejected") continue;
    const ai = aiResult.value;

    picks.push({
      symbol: c.def.symbol,
      name: c.def.name,
      price: c.price,
      changePercent: c.quote?.changePct ?? 0,
      direction: ai.direction,
      qualityScore: ai.qualityScore,
      confidence: ai.confidence,
      entry: ai.entry,
      stopLoss: ai.stopLoss,
      takeProfit: ai.takeProfit,
      reasoning: ai.reasoning,
      checklist: ai.tradeChecklist,
      alignmentCount: c.score,
      alignedTimeframes: c.alignedTimeframes,
    });
  }

  const result: AiPicksResponse = { picks, generatedAt: new Date().toISOString() };
  cacheByLocale.set(cacheKey, { at: Date.now(), data: result });
  return result;
}

export { AiUnavailableError };
