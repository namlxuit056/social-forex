import { NextResponse } from "next/server";
import { resolveQuotes } from "@/lib/quotes/resolve-quotes";
import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";

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

function calculateRsi(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function calculateEma(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  const k = 2 / (period + 1);
  let ema = prices[0];
  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

function calculateMacd(prices: number[]): number {
  if (prices.length < 26) return 0;
  const ema12 = calculateEma(prices, 12);
  const ema26 = calculateEma(prices, 26);
  return ema12 - ema26;
}

function calculateAtr(highs: number[], lows: number[], closes: number[]): number {
  if (highs.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1]),
    );
    sum += tr;
  }
  return sum / (highs.length - 1);
}

export async function GET(): Promise<NextResponse> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const quotesResponse = await resolveQuotes();
    const pairs: ScreenerPair[] = [];

    for (const def of QUOTE_DEFINITIONS) {
      const quote = quotesResponse.quotes.find((q) => q.symbol === def.symbol);
      if (!quote) continue;

      const price = (quote.bid + quote.ask) / 2;
      const change24h = price * (quote.changePct / 100);
      const changePercent24h = quote.changePct;

      const mockPrices = Array.from({ length: 50 }, (_, i) =>
        price * (1 + (Math.sin(i * 0.3) * 0.01)),
      );

      const rsi = calculateRsi(mockPrices);
      const macd = calculateMacd(mockPrices);
      const ema20 = calculateEma(mockPrices, 20);
      const ema50 = calculateEma(mockPrices, 50);
      const atr = price * 0.008;
      const volatility = (atr / price) * 100;

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
