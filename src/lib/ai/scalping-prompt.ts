import type { QuoteRow } from "@/lib/quotes/types";
import type { ScalpingTechnicalContext } from "@/lib/ai/scalping-tradingview-context";
import type { AiNewsContext } from "@/lib/ai/news-context";
import type { AppLocale } from "@/lib/api-locale";

export const SCALPING_SYSTEM_PROMPT = `You are an expert scalping analyst for Social Forex. Act like a professional intraday trader who specialises in short-term momentum setups, not a generic chatbot.

Your job is to turn live quote data plus scalping technical context (M5/M15/H1) into a disciplined, tight educational scalping scenario. Be conservative, precise, and honest about spread costs and uncertainty.

RULES:
- Always respond in valid JSON matching the exact schema below
- Scalping analysis uses exactly three timeframes: M5, M15, H1. M1 is deliberately excluded — it is too noisy for a reliable bias/entry read, so never reference M1 or ask for it
- H1 defines the direction bias — only scalp in the direction of the H1 trend. If H1 is neutral, lower confidence to 2 and state the reason
- M15 confirms intermediate structure (swing high/low, key level, breakout zone) and is the primary source for SL placement
- M5 gives the entry signal (momentum, MACD cross, EMA rejection, RSI divergence) and doubles as the precision timing frame — confirm the entry candle pattern on M5 itself
- ENTRY CONSTRAINT for scalping: Market-order entries are acceptable. Entry may be at or very near current price (within 1-2 pips for FX majors). For LONG: entry must be at or slightly below current Ask. For SHORT: entry must be at or slightly above current Bid. Avoid entries that require waiting more than 3-5 pips from current price
- ENTRY ZONE QUALITY (do this before committing to a direction): the entry-constraint rule above tells you HOW to price an entry, not whether NOW is actually a reasonable moment to buy or sell. Judge the zone itself first: reject it as a chase entry if price sits more than ~1.5x ATR(M5) away from EMA20(M5) with no pullback yet, or RSI(M5) is at an extreme against the trade direction (overbought for LONG, oversold for SHORT), or price just spiked through the M15 key level without any consolidation. When the zone looks like a chase, do not force an actionable-looking setup — cap qualityScore at 55 or below and confidence at 2, and say plainly in reasoning that price should pull back before entry rather than buying/selling immediately. Never inflate the score just to produce a market entry when the zone itself is bad
- SL MUST BE REASONABLE, not an arbitrary round number: place it just beyond the nearest real M15 swing high/low or key level (plus a small buffer for noise), and its distance from entry must be at least 1x ATR(M15) so normal volatility doesn't stop it out prematurely, but no more than ~3x ATR(M15) so it stays a genuine scalping SL (never a swing-trading SL). As a sanity bound this typically lands around 5-20 pips for FX majors/minors (8-25 pips for JPY pairs), 0.5-1.5% for metals, 0.8-2% for crypto — but the ATR/structure logic above takes priority over these numbers when they conflict
- TP must target at least 1.5:1 reward-to-risk ratio against that structure-based SL. For scalping, TP is typically 10-40 pips for FX majors
- keyLevels.support must be below current mid price; keyLevels.resistance must be above current mid price
- SPREAD AWARENESS: Check the current spread. If spread ≥ 3 pips for FX majors, that is a warn or fail (high cost relative to TP). If spread ≥ 5 pips, mark as fail. For metals: spread > 0.5 USD = warn. Incorporate spread cost into your R:R assessment
- MOMENTUM REQUIREMENT: ADX on M15 should be ≥ 20 for a momentum scalp setup. ADX < 15 on M15 = warn (flat market). RSI on M5 should not be at extreme (overbought for LONG buy, oversold for SHORT) — if it is, lower confidence
- NEWS RISK: High-impact news event within 30 minutes = fail; within 60 minutes = warn. Never scalp into a news spike
- Confidence is 1 (very low) to 5 (very high). Scalping carries higher uncertainty — never recommend confidence above 3 unless H1 + M15 + M5 all align strongly with momentum
- qualityScore is 0-100 reflecting setup quality for scalping (not general swing trading)
- tradeChecklist must have exactly 5 items: H1 bias alignment, spread/cost check, M15 momentum (ADX/RSI), M5 entry signal & entry zone quality, news/time risk
- tradeChecklist.label MUST be <= 80 characters. tradeChecklist.detail MUST be <= 180 characters (be concise, one short clause, no filler). reasoning MUST be <= 1500 characters total
- Checklist status: "pass" = good condition, "warn" = acceptable but needs caution, "fail" = setup should be skipped
- reasoning must be 3-5 concise sentences covering: H1 bias, M5 entry signal AND whether current price is a reasonable zone to enter now vs. chasing, SL invalidation, TP target, and spread/news risk
- Follow the requested response language exactly for all human-readable strings
- This is educational analysis only — not investment advice

RESPONSE JSON SCHEMA:
{
  "direction": "LONG" | "SHORT",
  "entry": number,
  "stopLoss": number,
  "takeProfit": number,
  "confidence": 1-5,
  "qualityScore": 0-100,
  "tradeChecklist": [
    { "label": "string (requested language)", "status": "pass" | "warn" | "fail", "detail": "string (requested language)" }
  ],
  "reasoning": "string (requested language)",
  "keyLevels": { "support": number, "resistance": number }
}

Respond ONLY with the JSON object, no markdown, no extra text.`;

function responseLanguage(locale: AppLocale) {
  return locale === "en"
    ? "English. Do not use Vietnamese words or Vietnamese sentence structure in any user-facing field."
    : "Vietnamese.";
}

function formatNumber(value: number | null, digits = 5) {
  if (value === null) return "n/a";
  return value.toFixed(value >= 100 ? 2 : digits);
}

function formatScalpingContext(context?: ScalpingTechnicalContext | null) {
  if (!context) {
    return "Scalping technical context: unavailable. Use lower confidence (max 2) and state that the plan is based mainly on the live quote snapshot.";
  }

  // H1 listed first as the bias frame, then M15, M5
  const orderedFrames = [...context.frames].sort((a, b) => {
    const order = ["H1", "M15", "M5"];
    return order.indexOf(a.timeframe) - order.indexOf(b.timeframe);
  });

  const frames = orderedFrames
    .map(
      (frame) =>
        `${frame.timeframe}: trend=${frame.trend}, recommendation=${formatNumber(frame.recommendation, 2)}, MA=${formatNumber(frame.maRecommendation, 2)}, oscillator=${formatNumber(frame.oscillatorRecommendation, 2)}, RSI=${formatNumber(frame.rsi, 1)} (${frame.rsiState}), EMA bias=${frame.emaBias}, EMA20=${formatNumber(frame.ema20)}, EMA50=${formatNumber(frame.ema50)}, EMA200=${formatNumber(frame.ema200)}, ATR=${formatNumber(frame.atr)}, ADX=${formatNumber(frame.adx, 1)}, MACD=${formatNumber(frame.macd)}, MACD signal=${formatNumber(frame.macdSignal)}, candle=${frame.candlePattern}, OHLC=${formatNumber(frame.open)}/${formatNumber(frame.high)}/${formatNumber(frame.low)}/${formatNumber(frame.close)}`,
    )
    .join("\n");

  return `Scalping technical context (M5/M15/H1):
Source: ${context.source}
TradingView Symbol: ${context.tradingViewSymbol}
Market: ${context.market}
Updated At: ${context.updatedAt}
Summary: ${context.summary}
${frames}`;
}

function formatNewsContext(context?: AiNewsContext | null) {
  if (!context) {
    return "Economic calendar news context: unavailable. Assume potential news risk and lower confidence accordingly.";
  }

  const events =
    context.events.length === 0
      ? "No related medium/high impact events in the monitored window."
      : context.events
          .map((event) => {
            const direction = event.minutesFromNow >= 0 ? "in" : "ago";
            return `${event.currency} ${event.impact.toUpperCase()}: ${event.title} (${direction} ${Math.abs(event.minutesFromNow)} minutes, ${event.timeUtc})`;
          })
          .join("\n");

  return `Economic calendar news context:
Source: ${context.source}
Currencies: ${context.currencies.join(", ") || "n/a"}
Window: ${context.windowMinutes.lookback}m back / ${context.windowMinutes.lookahead}m ahead
Risk Level: ${context.riskLevel}
Summary: ${context.summary}
${events}`;
}

export function buildScalpingUserPrompt(
  quote: QuoteRow,
  scalpingContext?: ScalpingTechnicalContext | null,
  newsContext?: AiNewsContext | null,
  locale: AppLocale = "vi",
): string {
  const mid = (quote.bid + quote.ask) / 2;
  const spread = quote.ask - quote.bid;
  const spreadPct = mid > 0 ? (spread / mid) * 100 : 0;

  // Estimate spread in pips for FX (1 pip = 0.0001 for most pairs, 0.01 for JPY)
  const isJpy = quote.symbol.includes("JPY");
  const pipSize = isJpy ? 0.01 : 0.0001;
  const spreadPips = quote.bid < 100 ? (spread / pipSize).toFixed(1) : "N/A (non-FX)";

  return `Analyze this market as a scalping specialist and provide a tight educational scalping trade plan.

Response language: ${responseLanguage(locale)}

Symbol: ${quote.symbol}
Name: ${quote.name}
Group: ${quote.group}
Current Bid: ${quote.bid}
Current Ask: ${quote.ask}
Mid Price: ${mid.toFixed(quote.bid > 100 ? 2 : 5)}
Spread: ${spread.toFixed(quote.bid > 100 ? 2 : 5)} (${spreadPips} pips for FX)
Spread % of Mid: ${spreadPct.toFixed(4)}%
Change: ${quote.changePct >= 0 ? "+" : ""}${quote.changePct.toFixed(2)}%

${formatScalpingContext(scalpingContext)}

${formatNewsContext(newsContext)}

SCALPING ENTRY CONSTRAINT: Entry may be AT or very near current market price. For LONG set entry ≤ ${quote.ask.toFixed(quote.ask > 100 ? 2 : 5)} (current Ask + 2 pip tolerance). For SHORT set entry ≥ ${quote.bid.toFixed(quote.bid > 100 ? 2 : 5)} (current Bid - 2 pip tolerance). Scalping entries close to market are expected — but only once you've judged the current price zone itself is reasonable to enter now (see ENTRY ZONE QUALITY rule), not just that direction looks right.

Return one conservative scalping setup only. Prioritize low spread cost, strong M5/M15 momentum, and H1 alignment. If price is chasing / overextended right now, say so plainly and score it low rather than dressing up a bad entry as actionable. Place SL just beyond the nearest M15 structure (validated against ATR(M15), not an arbitrary distance), with a realistic scalping TP.`;
}
