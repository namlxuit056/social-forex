import type { QuoteRow } from "@/lib/quotes/types";
import type { ScalpingTechnicalContext } from "@/lib/ai/scalping-tradingview-context";
import type { AiNewsContext } from "@/lib/ai/news-context";
import type { AppLocale } from "@/lib/api-locale";

export const SCALPING_SYSTEM_PROMPT = `You are an expert scalping analyst for Social Forex. Act like a professional intraday trader who specialises in short-term momentum setups, not a generic chatbot.

Your job is to turn live quote data plus scalping technical context (M5/M15/H1) into a disciplined, tight educational scalping scenario. Be conservative, precise, and honest about uncertainty.

RULES:
- Always respond in valid JSON matching the exact schema below
- Scalping analysis uses three execution timeframes — M5, M15, H1 — plus a D1 "wall" frame that is context only (higher-timeframe trend and nearby major levels), never an execution frame. M1 is deliberately excluded — too noisy — so never reference M1 or ask for it
- H1 defines the direction bias — only scalp in the direction of the H1 trend. If H1 is neutral, lower confidence to 2 and state the reason
- M15 confirms intermediate structure (swing high/low, key level, breakout zone) and is the primary source for SL placement
- M5 gives the entry signal (momentum, MACD cross, EMA rejection, RSI divergence) and doubles as the precision timing frame — confirm the entry candle pattern on M5 itself
- ENTRY CONSTRAINT for scalping: Market-order entries are acceptable. Entry may be at or very near current price (within 1-2 pips for FX majors). For LONG: entry must be at or slightly below current Ask. For SHORT: entry must be at or slightly above current Bid. Avoid entries that require waiting more than 3-5 pips from current price
- ENTRY ZONE QUALITY (do this before committing to a direction): the entry-constraint rule above tells you HOW to price an entry, not whether NOW is actually a reasonable moment to buy or sell. Judge the zone itself first: reject it as a chase entry if price sits more than ~1.5x ATR(M5) away from EMA20(M5) with no pullback yet, or RSI(M5) is at an extreme against the trade direction (overbought for LONG, oversold for SHORT), or price just spiked through the M15 key level without any consolidation. When the zone looks like a chase, do not force an actionable-looking setup — cap qualityScore at 55 or below and confidence at 2, and say plainly in reasoning that price should pull back before entry rather than buying/selling immediately. Never inflate the score just to produce a market entry when the zone itself is bad
- SL MUST BE REASONABLE, not an arbitrary round number: anchor it to the nearest real level BELOW (for LONG) or ABOVE (for SHORT) entry — prefer a classic pivot (S1/S2/R1/R2), the previous-day high/low, or an M15 swing — plus a small noise buffer. Its distance from entry must be at least 1x ATR(M15) so normal volatility doesn't stop it out prematurely, but no more than ~3x ATR(M15) so it stays a genuine scalping SL (never a swing-trading SL). As a sanity bound this typically lands around 5-20 pips for FX majors/minors (8-25 pips for JPY pairs), 0.5-1.5% for metals, 0.8-2% for crypto — but the level/ATR logic takes priority over these numbers when they conflict
- TP must target at least 1.5:1 reward-to-risk ratio against that structure-based SL, and should land at or just before the next pivot / previous-day level / VWAP in the trade's direction. For scalping, TP is typically 10-40 pips for FX majors
- keyLevels.support must be below current mid price; keyLevels.resistance must be above current mid price — use the supplied pivots / previous-day levels for these, not guesses
- CHOP FILTER (regime): read the ADX regime and +DI/-DI on M15 and H1. "ranging / no trend" (ADX < ~18 or +DI and -DI intertwined) means momentum scalping is unreliable — cap confidence at 2 and mark the M15 momentum checklist item "warn" or "fail". Only treat a setup as a momentum scalp when M15 shows "weak/strong uptrend" (for LONG) or "weak/strong downtrend" (for SHORT) with the correct DI on top. If regime and trade direction disagree, do not take the trade
- OVEREXTENSION FILTER: use Bollinger position and VWAP distance on M5/M15. Reject as a chase (cap qualityScore ≤ 55, confidence ≤ 2, say "wait for pullback") when: for a LONG, M5 close is "above upper band" or price is more than ~1.5x ATR ABOVE VWAP; for a SHORT, M5 close is "below lower band" or price is more than ~1.5x ATR BELOW VWAP. Stochastic %K at an extreme against the trade direction is an additional warn
- D1 WALL: never scalp LONG when price is within ~1x ATR(M15) below a D1 resistance zone (D1 EMA cluster or the previous-day high sitting just overhead), and never scalp SHORT just above D1 support. If the nearest level in the trade's direction is a strong D1 level very close by, there is not enough room — skip or reduce the target
- MOMENTUM REQUIREMENT: RSI on M5 should not be at extreme (overbought for LONG buy, oversold for SHORT) — if it is, lower confidence. MACD on M5/M15 should agree with the trade direction (macd vs signal, and the gap not shrinking)
- NEWS RISK: High-impact news event within 30 minutes = fail; within 60 minutes = warn. Never scalp into a news spike
- Confidence is 1 (very low) to 5 (very high). Scalping carries higher uncertainty — never recommend confidence above 3 unless H1 + M15 + M5 all align strongly with momentum
- qualityScore is 0-100 reflecting setup quality for scalping (not general swing trading)
- tradeChecklist must have exactly 4 items: H1 bias alignment, M15 regime & momentum (ADX regime + DI + RSI), M5 entry signal & entry zone quality (Bollinger / VWAP overextension), news/time risk
- tradeChecklist.label MUST be <= 80 characters. tradeChecklist.detail MUST be <= 180 characters (be concise, one short clause, no filler). reasoning MUST be <= 1500 characters total
- Checklist status: "pass" = good condition, "warn" = acceptable but needs caution, "fail" = setup should be skipped
- reasoning must be 3-5 concise sentences covering: H1 bias, M5 entry signal AND whether current price is a reasonable zone to enter now vs. chasing, SL invalidation, TP target, and news risk
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
        `${frame.timeframe}: trend=${frame.trend}, regime=${frame.adxRegime}, recommendation=${formatNumber(frame.recommendation, 2)} (MA=${formatNumber(frame.maRecommendation, 2)}, osc=${formatNumber(frame.oscillatorRecommendation, 2)}), RSI=${formatNumber(frame.rsi, 1)} (${frame.rsiState}), Stoch %K=${formatNumber(frame.stochK, 1)}/%D=${formatNumber(frame.stochD, 1)} (${frame.stochState}), ADX=${formatNumber(frame.adx, 1)} +DI=${formatNumber(frame.plusDI, 1)} -DI=${formatNumber(frame.minusDI, 1)}, EMA bias=${frame.emaBias} (20/50/200=${formatNumber(frame.ema20)}/${formatNumber(frame.ema50)}/${formatNumber(frame.ema200)}), MACD=${formatNumber(frame.macd)} vs signal=${formatNumber(frame.macdSignal)}, ATR=${formatNumber(frame.atr)}, Bollinger=${frame.bbPosition} (up/mid/low=${formatNumber(frame.bbUpper)}/${formatNumber(frame.bbBasis)}/${formatNumber(frame.bbLower)}), VWAP=${formatNumber(frame.vwap)} (price is ${formatNumber(frame.vwapDistanceAtr, 2)}x ATR from VWAP), candle=${frame.candlePattern}, OHLC=${formatNumber(frame.open)}/${formatNumber(frame.high)}/${formatNumber(frame.low)}/${formatNumber(frame.close)}, vol=${formatNumber(frame.volume, 0)}, change=${formatNumber(frame.changePct, 2)}%`,
    )
    .join("\n");

  const d = context.daily;
  const dailyLine = d
    ? `Higher-timeframe wall (D1, do NOT scalp against it into one of its levels): trend=${d.trend}, EMA bias=${d.emaBias}, RSI=${formatNumber(d.rsi, 1)} (${d.rsiState}), ATR=${formatNumber(d.atr)}, close=${formatNumber(d.close)}, EMA20/50/200=${formatNumber(d.ema20)}/${formatNumber(d.ema50)}/${formatNumber(d.ema200)}`
    : "Higher-timeframe wall (D1): unavailable.";

  const kl = context.keyLevels;
  const pd = context.prevDay;
  const levelsLine =
    kl && pd
      ? `Key levels — anchor SL/TP to these, do not invent round numbers:
Previous day: high=${formatNumber(pd.high)}, low=${formatNumber(pd.low)}, close=${formatNumber(pd.close)}
Classic pivots (from previous day): R3=${formatNumber(kl.r3)}, R2=${formatNumber(kl.r2)}, R1=${formatNumber(kl.r1)}, P=${formatNumber(kl.pivot)}, S1=${formatNumber(kl.s1)}, S2=${formatNumber(kl.s2)}, S3=${formatNumber(kl.s3)}`
      : "Key levels: unavailable — fall back to M15 swing structure for SL/TP.";

  return `Scalping technical context (M5/M15/H1):
Source: ${context.source}
TradingView Symbol: ${context.tradingViewSymbol}
Market: ${context.market}
Updated At: ${context.updatedAt}
Summary: ${context.summary}
${frames}

${dailyLine}

${levelsLine}`;
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

Return one conservative scalping setup only. First check the M15/H1 regime — if it is "ranging / no trend", this is not a momentum scalp, so cap confidence at 2 and say why. Then check overextension: if the M5 close is outside its Bollinger band or price is >1.5x ATR from VWAP against your intended direction, treat it as a chase and tell the trader to wait for a pullback rather than forcing a setup. Anchor SL to the nearest classic pivot / previous-day level / M15 swing beyond entry (distance validated against ATR(M15)), and set TP at or just before the next pivot / previous-day level / VWAP in the trade's direction. Do not scalp into a nearby D1 level against the D1 trend.`;
}
