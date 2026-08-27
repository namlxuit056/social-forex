import type { QuoteRow } from "@/lib/quotes/types";
import { toTradingViewSymbol } from "@/lib/quotes/tradingview-symbols";
import { pivotClassic } from "@/lib/calculators";

type ScannerMarket = "forex" | "cfd" | "crypto";
// "" = D1 (TradingView scanner rejects "|1D" and returns null for the D1 suffix)
type ScalpingTimeframeCode = "5" | "15" | "60" | "";

// M1 deliberately excluded — too noisy for a reliable scalping bias/entry read.
// D1 added only as a higher-timeframe wall + source of previous-day pivot levels.
const SCALPING_TIMEFRAMES: Array<{
  code: ScalpingTimeframeCode;
  label: "M5" | "M15" | "H1" | "D1";
}> = [
  { code: "5", label: "M5" },
  { code: "15", label: "M15" },
  { code: "60", label: "H1" },
  { code: "", label: "D1" },
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
  "ADX+DI",
  "ADX-DI",
  "MACD.macd",
  "MACD.signal",
  "BB.upper",
  "BB.lower",
  "BB.basis",
  "VWAP",
  "Stoch.K",
  "Stoch.D",
  "open",
  "high",
  "low",
  "close",
  "open[1]",
  "high[1]",
  "low[1]",
  "close[1]",
  "volume",
  "change",
] as const;

type Metric = (typeof METRICS)[number];

export type BbPosition =
  | "above upper band"
  | "upper half"
  | "lower half"
  | "below lower band"
  | "unknown";

export type AdxRegime =
  | "strong uptrend"
  | "strong downtrend"
  | "weak uptrend"
  | "weak downtrend"
  | "ranging / no trend"
  | "unknown";

export type ScalpingTechnicalFrame = {
  timeframe: "M5" | "M15" | "H1" | "D1";
  recommendation: number | null;
  maRecommendation: number | null;
  oscillatorRecommendation: number | null;
  rsi: number | null;
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  atr: number | null;
  adx: number | null;
  plusDI: number | null;
  minusDI: number | null;
  adxRegime: AdxRegime;
  macd: number | null;
  macdSignal: number | null;
  bbUpper: number | null;
  bbLower: number | null;
  bbBasis: number | null;
  bbPosition: BbPosition;
  vwap: number | null;
  /** (close - vwap) / ATR — how stretched price is from the intraday mean */
  vwapDistanceAtr: number | null;
  stochK: number | null;
  stochD: number | null;
  stochState: "overbought" | "oversold" | "neutral";
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

export type ScalpingKeyLevels = {
  /** classic pivots computed from the previous D1 candle */
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
};

export type ScalpingTechnicalContext = {
  source: "TradingView scanner";
  symbol: string;
  tradingViewSymbol: string;
  market: ScannerMarket;
  updatedAt: string;
  /** M5, M15, H1 — the scalping frames */
  frames: ScalpingTechnicalFrame[];
  /** D1 frame — higher-timeframe wall only, not a scalp frame */
  daily: ScalpingTechnicalFrame | null;
  /** previous completed D1 candle */
  prevDay: { high: number; low: number; close: number } | null;
  keyLevels: ScalpingKeyLevels | null;
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

/** Where the last close sits relative to the Bollinger Bands. */
export function bbPosition(
  close: number | null,
  upper: number | null,
  lower: number | null,
  basis: number | null,
): BbPosition {
  if (close === null || upper === null || lower === null || basis === null) {
    return "unknown";
  }
  if (close > upper) return "above upper band";
  if (close < lower) return "below lower band";
  return close >= basis ? "upper half" : "lower half";
}

export function stochState(k: number | null): ScalpingTechnicalFrame["stochState"] {
  if (k === null) return "neutral";
  if (k >= 80) return "overbought";
  if (k <= 20) return "oversold";
  return "neutral";
}

/**
 * ADX + DI regime — the chop filter. Below ~20 with DI intertwined = ranging
 * (fade extremes); above ~23 with DI separated = trend (only take pullbacks).
 */
export function adxRegime(
  adx: number | null,
  plusDI: number | null,
  minusDI: number | null,
): AdxRegime {
  if (adx === null || plusDI === null || minusDI === null) return "unknown";
  const up = plusDI > minusDI;
  const separation = Math.abs(plusDI - minusDI);
  if (adx < 18 || separation < 4) return "ranging / no trend";
  if (adx >= 25) return up ? "strong uptrend" : "strong downtrend";
  return up ? "weak uptrend" : "weak downtrend";
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
  return values.get(code ? `${metric}|${code}` : metric) ?? null;
}

function buildSummary(frames: ScalpingTechnicalFrame[], daily: ScalpingTechnicalFrame | null) {
  const parts = frames.map((frame) => {
    const rsi = frame.rsi === null ? "n/a" : frame.rsi.toFixed(1);
    return `${frame.timeframe}: ${frame.trend}, ${frame.adxRegime}, RSI ${rsi} (${frame.rsiState}), BB ${frame.bbPosition}, Stoch ${frame.stochState}, candle ${frame.candlePattern}`;
  });
  if (daily) {
    parts.push(`D1 wall: ${daily.trend}, EMA ${daily.emaBias}, RSI ${daily.rsi?.toFixed(1) ?? "n/a"}`);
  }
  return parts.join("; ");
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
    METRICS.map((metric) => (code ? `${metric}|${code}` : metric)),
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

  const allFrames = SCALPING_TIMEFRAMES.map(({ code, label }) => {
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
    const atr = valueAt(values, "ATR", code);
    const adx = valueAt(values, "ADX", code);
    const plusDI = valueAt(values, "ADX+DI", code);
    const minusDI = valueAt(values, "ADX-DI", code);
    const bbUpper = valueAt(values, "BB.upper", code);
    const bbLower = valueAt(values, "BB.lower", code);
    const bbBasis = valueAt(values, "BB.basis", code);
    const vwap = valueAt(values, "VWAP", code);
    const stochK = valueAt(values, "Stoch.K", code);

    const vwapDistanceAtr =
      close !== null && vwap !== null && atr !== null && atr > 0
        ? Math.round(((close - vwap) / atr) * 100) / 100
        : null;

    return {
      timeframe: label,
      recommendation,
      maRecommendation: valueAt(values, "Recommend.MA", code),
      oscillatorRecommendation: valueAt(values, "Recommend.Other", code),
      rsi,
      ema20,
      ema50,
      ema200,
      atr,
      adx,
      plusDI,
      minusDI,
      adxRegime: adxRegime(adx, plusDI, minusDI),
      macd: valueAt(values, "MACD.macd", code),
      macdSignal: valueAt(values, "MACD.signal", code),
      bbUpper,
      bbLower,
      bbBasis,
      bbPosition: bbPosition(close, bbUpper, bbLower, bbBasis),
      vwap,
      vwapDistanceAtr,
      stochK,
      stochD: valueAt(values, "Stoch.D", code),
      stochState: stochState(stochK),
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

  const frames = allFrames.filter((f) => f.timeframe !== "D1");
  const daily = allFrames.find((f) => f.timeframe === "D1") ?? null;

  // Previous completed D1 candle → classic pivots for scalp SL/TP anchoring
  const prevHigh = valueAt(values, "high[1]", "");
  const prevLow = valueAt(values, "low[1]", "");
  const prevClose = valueAt(values, "close[1]", "");
  const prevDay =
    prevHigh !== null && prevLow !== null && prevClose !== null
      ? { high: prevHigh, low: prevLow, close: prevClose }
      : null;
  const keyLevels = prevDay
    ? (() => {
        const p = pivotClassic(prevDay.high, prevDay.low, prevDay.close);
        return {
          pivot: p.pivot,
          r1: p.r1,
          r2: p.r2,
          r3: p.r3,
          s1: p.s1,
          s2: p.s2,
          s3: p.s3,
        };
      })()
    : null;

  const context: ScalpingTechnicalContext = {
    source: "TradingView scanner",
    symbol: quote.symbol,
    tradingViewSymbol: tvSymbol,
    market,
    updatedAt: new Date().toISOString(),
    frames,
    daily,
    prevDay,
    keyLevels,
    summary: buildSummary(frames, daily),
  };

  cache.set(cacheKey, { context, at: Date.now() });
  return context;
}
