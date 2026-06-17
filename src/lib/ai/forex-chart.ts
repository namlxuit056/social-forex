import { put } from "@vercel/blob";
import type { QuoteGroup } from "@/lib/quotes/types";
import type { TradingViewTechnicalContext } from "@/lib/ai/tradingview-context";
import { getTradingViewTechnicalContext } from "@/lib/ai/tradingview-context";
import { toTradingViewSymbol } from "@/lib/quotes/tradingview-symbols";

// ─── Symbol extraction ───────────────────────────────────────────────────────

const KEYWORD_SYMBOL_MAP: [RegExp, string, QuoteGroup][] = [
  [/\b(EURUSD|EUR\/USD|EUR-USD)\b/i, "EURUSD", "major"],
  [/\b(GBPUSD|GBP\/USD|GBP-USD|pound|sterling)\b/i, "GBPUSD", "major"],
  [/\b(USDJPY|USD\/JPY|USD-JPY|yen|jpy)\b/i, "USDJPY", "major"],
  [/\b(AUDUSD|AUD\/USD|AUD-USD|aussie)\b/i, "AUDUSD", "major"],
  [/\b(USDCAD|USD\/CAD|USD-CAD|loonie)\b/i, "USDCAD", "major"],
  [/\b(NZDUSD|NZD\/USD|NZD-USD|kiwi)\b/i, "NZDUSD", "major"],
  [/\b(USDCHF|USD\/CHF|USD-CHF|franc|chf)\b/i, "USDCHF", "major"],
  [/\b(EURGBP|EUR\/GBP|EUR-GBP)\b/i, "EURGBP", "major"],
  [/\b(EURJPY|EUR\/JPY|EUR-JPY)\b/i, "EURJPY", "major"],
  [/\b(GBPJPY|GBP\/JPY|GBP-JPY)\b/i, "GBPJPY", "major"],
  [/\b(XAUUSD|XAU\/USD|gold|vàng|kim loại quý)\b/i, "XAUUSD", "metal"],
  [/\b(XAGUSD|XAG\/USD|silver|bạc)\b/i, "XAGUSD", "metal"],
  [/\b(USOIL|oil|crude|dầu|WTI|brent)\b/i, "USOIL", "energy"],
  [/\b(BTCUSD|BTC\/USD|bitcoin|btc)\b/i, "BTCUSD", "crypto"],
  [/\b(ETHUSD|ETH\/USD|ethereum|eth)\b/i, "ETHUSD", "crypto"],
];

export function extractSymbolFromKeyword(keyword: string): {
  symbol: string;
  group: QuoteGroup;
} | null {
  for (const [pattern, symbol, group] of KEYWORD_SYMBOL_MAP) {
    if (pattern.test(keyword)) return { symbol, group };
  }

  // Generic XX/YY or XXYY pattern
  const match = keyword.match(/\b([A-Z]{3})[\/\-]?([A-Z]{3})\b/i);
  if (match) {
    return {
      symbol: `${match[1].toUpperCase()}${match[2].toUpperCase()}`,
      group: "major",
    };
  }

  return null;
}

// ─── Technical context ───────────────────────────────────────────────────────

export async function getSymbolTechnicalContext(
  symbol: string,
  group: QuoteGroup,
): Promise<TradingViewTechnicalContext | null> {
  return getTradingViewTechnicalContext({
    symbol,
    name: symbol,
    group,
    bid: 0,
    ask: 0,
    changePct: 0,
  });
}

/** Format technical context as a compact prompt block. */
export function formatTechnicalContextBlock(ctx: TradingViewTechnicalContext): string {
  const lines = [
    `Symbol: ${ctx.symbol} (TradingView: ${ctx.tradingViewSymbol})`,
    `Updated: ${ctx.updatedAt}`,
    "",
  ];

  for (const frame of ctx.frames) {
    const close = frame.close !== null ? frame.close.toFixed(5) : "n/a";
    const rsi = frame.rsi !== null ? frame.rsi.toFixed(1) : "n/a";
    const adx = frame.adx !== null ? frame.adx.toFixed(1) : "n/a";
    const ema20 = frame.ema20 !== null ? frame.ema20.toFixed(5) : "n/a";
    const ema50 = frame.ema50 !== null ? frame.ema50.toFixed(5) : "n/a";
    const ema200 = frame.ema200 !== null ? frame.ema200.toFixed(5) : "n/a";
    const macd =
      frame.macd !== null && frame.macdSignal !== null
        ? `${frame.macd > frame.macdSignal ? "positive cross" : "negative cross"}`
        : "n/a";
    const change =
      frame.changePct !== null ? `${frame.changePct >= 0 ? "+" : ""}${frame.changePct.toFixed(2)}%` : "n/a";

    lines.push(
      `${frame.timeframe}: ${frame.trend.toUpperCase()} | close=${close} (${change}) | RSI=${rsi} (${frame.rsiState}) | EMA bias=${frame.emaBias} | EMA20=${ema20} EMA50=${ema50} EMA200=${ema200} | ADX=${adx} | MACD=${macd} | candle=${frame.candlePattern}`,
    );
  }

  return lines.join("\n");
}

// ─── Chart image (chart-img.com → Vercel Blob) ───────────────────────────────

export type ChartImage = { url: string; alt: string; credit: string };

/**
 * Fetch a TradingView chart screenshot from chart-img.com and upload to Vercel Blob.
 * Requires CHART_IMG_API_KEY and BLOB_READ_WRITE_TOKEN. Returns null when not configured.
 */
export async function fetchChartImage(symbol: string): Promise<ChartImage | null> {
  const chartKey = process.env.CHART_IMG_API_KEY;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!chartKey) return null;

  const tvSymbol = toTradingViewSymbol(symbol);

  try {
    const res = await fetch("https://api.chart-img.com/v2/tradingview/advanced-chart", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": chartKey,
      },
      body: JSON.stringify({
        symbol: tvSymbol,
        interval: "1D",
        theme: "dark",
        width: 800,
        height: 420,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";

    // chart-img.com can return JSON with a URL or raw image bytes
    if (contentType.includes("application/json")) {
      const json = (await res.json()) as { url?: string };
      if (!json.url) return null;
      return {
        url: json.url,
        alt: `${symbol} daily chart`,
        credit: "Chart by chart-img.com / TradingView",
      };
    }

    // Raw image bytes — upload to Vercel Blob
    if (!blobToken) return null;

    const imageBuffer = await res.arrayBuffer();
    const filename = `charts/${symbol.toLowerCase()}-${Date.now()}.png`;
    const { url } = await put(filename, imageBuffer, {
      access: "public",
      contentType: "image/png",
      token: blobToken,
    });

    return {
      url,
      alt: `${symbol} daily price chart`,
      credit: "Chart by TradingView via chart-img.com",
    };
  } catch {
    return null;
  }
}
