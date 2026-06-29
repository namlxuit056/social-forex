import { resolveQuotes } from "@/lib/quotes/resolve-quotes";
import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";
import { getTradingViewTechnicalContext } from "@/lib/ai/tradingview-context";
import type { QuoteRow } from "@/lib/quotes/types";

export type ScreenerPair = {
  symbol: string;
  name: string;
  group: string;
  price: number;
  changePercent: number;
  rsi: number | null;
  adx: number | null;
  emaBias: "bullish" | "bearish" | "mixed" | "unknown";
  recM15: number | null;
  recH1: number | null;
  recH4: number | null;
  recD1: number | null;
};

const CACHE_TTL = 60_000;
let cache: { at: number; data: ScreenerPair[] } | null = null;

export async function fetchScreenerPairs(): Promise<ScreenerPair[]> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL) {
    return cache.data;
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

  const technicalResults = await Promise.allSettled(
    QUOTE_DEFINITIONS.map((def) => {
      const quote = quoteRows.find((q) => q.symbol === def.symbol);
      return quote
        ? getTradingViewTechnicalContext(quote)
        : Promise.resolve(null);
    }),
  );

  const pairs: ScreenerPair[] = QUOTE_DEFINITIONS.map((def, i) => {
    const quote = quoteRows.find((q) => q.symbol === def.symbol);
    const price = quote ? (quote.bid + quote.ask) / 2 : def.mockMid;
    const changePercent = quote?.changePct ?? 0;

    const tvResult = technicalResults[i];
    const tvContext =
      tvResult.status === "fulfilled" ? tvResult.value : null;

    const m15 = tvContext?.frames.find((f) => f.timeframe === "M15");
    const h1 = tvContext?.frames.find((f) => f.timeframe === "H1");
    const h4 = tvContext?.frames.find((f) => f.timeframe === "H4");
    const d1 = tvContext?.frames.find((f) => f.timeframe === "D1");

    return {
      symbol: def.symbol,
      name: def.name,
      group: def.group,
      price,
      changePercent,
      rsi: d1?.rsi ?? null,
      adx: d1?.adx ?? null,
      emaBias: d1?.emaBias ?? "unknown",
      recM15: m15?.recommendation ?? null,
      recH1: h1?.recommendation ?? null,
      recH4: h4?.recommendation ?? null,
      recD1: d1?.recommendation ?? null,
    };
  });

  cache = { at: now, data: pairs };
  return pairs;
}
