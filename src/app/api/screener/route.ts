import { NextResponse } from "next/server";
import { resolveQuotes } from "@/lib/quotes/resolve-quotes";
import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";
import { getTradingViewTechnicalContext } from "@/lib/ai/tradingview-context";
import type { QuoteRow } from "@/lib/quotes/types";

export const runtime = "nodejs";

type ScreenerPair = {
  symbol: string;
  name: string;
  group: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  rsi: number;
  macd: number;
  ema20: number;
  ema50: number;
  atr: number;
  volatility: number;
};

const CACHE_TTL = 60_000;
let cache: { at: number; data: ScreenerPair[] } | null = null;

export async function GET(): Promise<NextResponse> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const quotesResponse = await resolveQuotes();
    const pairs: ScreenerPair[] = [];

    const quoteRows: QuoteRow[] = quotesResponse.quotes.map((q) => ({
      symbol: q.symbol,
      name: q.name,
      group: q.group,
      bid: q.bid,
      ask: q.ask,
      changePct: q.changePct,
    }));

    const technicalResults = await Promise.allSettled(
      quoteRows.map((q) => getTradingViewTechnicalContext(q)),
    );

    for (let i = 0; i < QUOTE_DEFINITIONS.length; i++) {
      const def = QUOTE_DEFINITIONS[i];
      const quote = quoteRows.find((q) => q.symbol === def.symbol);
      if (!quote) continue;

      const price = (quote.bid + quote.ask) / 2;
      const change24h = price * (quote.changePct / 100);
      const changePercent24h = quote.changePct;

      const tvResult = technicalResults[i];
      const tvContext =
        tvResult.status === "fulfilled" ? tvResult.value : null;

      // Use D1 (daily) timeframe for screener metrics
      const d1 = tvContext?.frames.find((f) => f.timeframe === "D1");

      const rsi = d1?.rsi ?? 50;
      const macd = d1?.macd ?? 0;
      const ema20 = d1?.ema20 ?? price;
      const ema50 = d1?.ema50 ?? price;
      const atr = d1?.atr ?? price * 0.008;
      const volatility = price > 0 ? (atr / price) * 100 : 0;

      pairs.push({
        symbol: def.symbol,
        name: def.name,
        group: def.group,
        price,
        change24h,
        changePercent24h,
        rsi,
        macd,
        ema20,
        ema50,
        atr,
        volatility,
      });
    }

    cache = { at: now, data: pairs };
    return NextResponse.json(pairs);
  } catch {
    return NextResponse.json([]);
  }
}
