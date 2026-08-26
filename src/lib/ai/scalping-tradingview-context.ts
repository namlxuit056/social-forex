import type { QuoteRow } from "@/lib/quotes/types";
import { toTradingViewSymbol } from "@/lib/quotes/tradingview-symbols";

type ScannerMarket = "forex" | "cfd" | "crypto";
type ScalpingTimeframeCode = "5" | "15" | "60";

// M1 deliberately excluded — too noisy for a reliable scalping bias/entry read.
const SCALPING_TIMEFRAMES: Array<{
  code: ScalpingTimeframeCode;
  label: "M5" | "M15" | "H1";
}> = [
  { code: "5", label: "M5" },
  { code: "15", label: "M15" },
  { code: "60", label: "H1" },
];

const METRICS = [
  "Recommend.All",
  "Recommend.MA",
  "Recommend.Other",
  "RSI",
  "RSI[1]",
  "EMA20",
  "EMA50",
  "EMA200",
  "ATR",
  "ADX",
  "MACD.macd",
  "MACD.signal",
  "open",
  "high",
  "low",
  "close",
  "open[1]",
  "close[1]",
  "volume",
  "change",
] as const;

type Metric = (typeof METRICS)[number];

export type ScalpingTechnicalFrame = {
  timeframe: "M5" | "M15" | "H1";
  recommendation: number | null;
  maRecommendation: number | null;
  oscillatorRecommendation: number | null;
  rsi: number | null;
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  atr: number | null;
  adx: number | null;
  macd: number | null;
  macdSignal: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  previousOpen: number | null;
  previousClose: number | null;
  volume: number | null;
  changePct: number | null;
  trend: "bullish" | "bearish" | "neutral";
  rsiState: "overbought" | "oversold" | "bullish" | "bearish" | "neutral";
  emaBias: "bullish" | "bearish" | "mixed" | "unknown";
  candlePattern: string;
};

export type ScalpingTechnicalContext = {
  source: "TradingView scanner";
  symbol: string;
  tradingViewSymbol: string;
  market: ScannerMarket;
  updatedAt: string;
  frames: ScalpingTechnicalFrame[];
  summary: string;
};

type ScannerResponse = {
  data?: Array<{ s?: string; d?: Array<number | null> }>;
};

const cache = new Map<string, { context: ScalpingTechnicalContext; at: number }>();
const CACHE_TTL_MS = 90 * 1000; // 90s — scalping needs fresher data

function marketForQuote(quote: QuoteRow): ScannerMarket {
  if (quote.group === "crypto") return "crypto";
  if (quote.group === "metal" || quote.group === "energy") return "cfd";
  return "forex";
}

function trendFromRecommendation(
  value: number | null,
): ScalpingTechnicalFrame["trend"] {
  if (value === null) return "neutral";
  if (value > 0.1) return "bullish";
  if (value < -0.1) return "bearish";
  return "neutral";
}

function rsiState(rsi: number | null): ScalpingTechnicalFrame["rsiState"] {
  if (rsi === null) return "neutral";
  if (rsi >= 70) return "overbought";
  if (rsi <= 30) return "oversold";
  if (rsi >= 55) return "bullish";
  if (rsi <= 45) return "bearish";
  return "neutral";
}

function emaBias(
  close: number | null,
  ema20: number | null,
  ema50: number | null,
  ema200: number | null,
): ScalpingTechnicalFrame["emaBias"] {
  if (close === null || ema20 === null || ema50 === null || ema200 === null) {
    return "unknown";
  }
  if (close > ema20 && ema20 > ema50 && ema50 > ema200) return "bullish";
  if (close < ema20 && ema20 < ema50 && ema50 < ema200) return "bearish";
  return "mixed";
}

function candlePattern({
  open,
  close,
  high,
  low,
  previousOpen,
  previousClose,
}: Pick<
  ScalpingTechnicalFrame,
  "open" | "close" | "high" | "low" | "previousOpen" | "previousClose"
>) {
  if (
    open === null ||
    close === null ||
    high === null ||
    low === null ||
    previousOpen === null ||
    previousClose === null
  ) {
    return "not enough candle data";
  }

  const range = Math.max(high - low, 0);
  const body = Math.abs(close - open);
  const upperWick = high - Math.max(open, close);
  const lowerWick = Math.min(open, close) - low;
  const bullish = close > open;
  const previousBullish = previousClose > previousOpen;

  if (range > 0 && body / range <= 0.18) return "doji / indecision";
  if (!previousBullish && bullish && open <= previousClose && close >= previousOpen) {
    return "bullish engulfing";
  }
  if (previousBullish && !bullish && open >= previousClose && close <= previousOpen) {
    return "bearish engulfing";
  }
  if (range > 0 && lowerWick / range >= 0.5 && upperWick / range <= 0.2) {
    return bullish ? "hammer-like rejection" : "bearish candle with lower rejection";
  }
  if (range > 0 && upperWick / range >= 0.5 && lowerWick / range <= 0.2) {
    return bullish ? "bullish candle with upper rejection" : "shooting-star-like rejection";
  }

  return bullish ? "bullish candle" : "bearish candle";
}

function valueAt(
  values: Map<string, number | null>,
  metric: Metric,
  code: ScalpingTimeframeCode,
) {
  return values.get(`${metric}|${code}`) ?? null;
}

function buildSummary(frames: ScalpingTechnicalFrame[]) {
  return frames
    .map((frame) => {
      const rsi = frame.rsi === null ? "n/a" : frame.rsi.toFixed(1);
      const adx = frame.adx === null ? "n/a" : frame.adx.toFixed(1);
      return `${frame.timeframe}: ${frame.trend}, RSI ${rsi} (${frame.rsiState}), ADX ${adx}, EMA ${frame.emaBias}, candle ${frame.candlePattern}`;
    })
    .join("; ");
}

function recommendationText(value: number | null) {
  if (value === null) return "no signal";
  if (value >= 0.5) return "strong buy";
  if (value >= 0.1) return "buy";
  if (value <= -0.5) return "strong sell";
  if (value <= -0.1) return "sell";
  return "neutral";
}

export async function getScalpingTechnicalContext(
  quote: QuoteRow,
): Promise<ScalpingTechnicalContext | null> {
  const tvSymbol = toTradingViewSymbol(quote.symbol);
  const market = marketForQuote(quote);
  const cacheKey = `scalping:${market}:${tvSymbol}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.context;
  }

  const columns = SCALPING_TIMEFRAMES.flatMap(({ code }) =>
    METRICS.map((metric) => `${metric}|${code}`),
  );

  const response = await fetch(`https://scanner.tradingview.com/${market}/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      symbols: {
        tickers: [tvSymbol],
        query: { types: [] },
      },
      columns,
    }),
    signal: AbortSignal.timeout(4000),
  });

  if (!response.ok) return null;

  const json = (await response.json()) as ScannerResponse;
  const row = json.data?.[0];
  if (!row?.d?.length) return null;

  const values = new Map<string, number | null>();
  columns.forEach((column, index) => {
    const raw = row.d?.[index] ?? null;
    values.set(column, typeof raw === "number" && Number.isFinite(raw) ? raw : null);
  });

  const frames = SCALPING_TIMEFRAMES.map(({ code, label }) => {
    const open = valueAt(values, "open", code);
    const high = valueAt(values, "high", code);
    const low = valueAt(values, "low", code);
    const close = valueAt(values, "close", code);
    const previousOpen = valueAt(values, "open[1]", code);
    const previousClose = valueAt(values, "close[1]", code);
    const ema20 = valueAt(values, "EMA20", code);
    const ema50 = valueAt(values, "EMA50", code);
    const ema200 = valueAt(values, "EMA200", code);
    const recommendation = valueAt(values, "Recommend.All", code);
    const rsi = valueAt(values, "RSI", code);

    return {
      timeframe: label,
      recommendation,
      maRecommendation: valueAt(values, "Recommend.MA", code),
      oscillatorRecommendation: valueAt(values, "Recommend.Other", code),
      rsi,
      ema20,
      ema50,
      ema200,
      atr: valueAt(values, "ATR", code),
      adx: valueAt(values, "ADX", code),
      macd: valueAt(values, "MACD.macd", code),
      macdSignal: valueAt(values, "MACD.signal", code),
      open,
      high,
      low,
      close,
      previousOpen,
      previousClose,
      volume: valueAt(values, "volume", code),
      changePct: valueAt(values, "change", code),
      trend: trendFromRecommendation(recommendation),
      rsiState: rsiState(rsi),
      emaBias: emaBias(close, ema20, ema50, ema200),
      candlePattern: candlePattern({ open, close, high, low, previousOpen, previousClose }),
    } satisfies ScalpingTechnicalFrame;
  });

  const context: ScalpingTechnicalContext = {
    source: "TradingView scanner",
    symbol: quote.symbol,
    tradingViewSymbol: tvSymbol,
    market,
    updatedAt: new Date().toISOString(),
    frames,
    summary: buildSummary(frames),
  };

  // Build summary with recommendation text for each frame (used internally)
  void recommendationText; // keep import-like reference

  cache.set(cacheKey, { context, at: Date.now() });
  return context;
}
