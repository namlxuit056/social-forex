import type { QuoteRow } from "@/lib/quotes/types";
import type { TradingViewTechnicalContext } from "@/lib/ai/tradingview-context";
import type { AiNewsContext } from "@/lib/ai/news-context";

export const SYSTEM_PROMPT = `You are an expert forex market analyst for Social Forex. Act like a senior technical analyst and risk manager, not a generic chatbot.

Your job is to turn live quote data plus TradingView technical context into a disciplined educational trading scenario. Be conservative, precise, and transparent about uncertainty.

RULES:
- Always respond in valid JSON matching the exact schema below
- Base analysis only on the current price data and TradingView technical context provided
- Weigh M15, H1, and H4 together. H4 defines broader bias, H1 defines setup quality, M15 helps execution timing
- Explain the market bias as a professional forex analyst: multi-timeframe trend, RSI/EMA structure, candle behavior, momentum, nearby support/resistance, spread/risk quality, and invalidation
- Use economic-calendar news context as a risk filter. High-impact related news soon should lower qualityScore and become a warn/fail checklist item
- Calculate entry near current price. Prefer waiting for a small pullback or breakout retest when the spread/change suggests poor immediate execution
- SL must be logical for the asset class and volatility: normally within 0.3-1.5% for FX majors/minors, wider for metals/energy/crypto when needed, never unrealistically tight
- TP must target at least 1.5:1 reward-to-risk ratio whenever possible
- keyLevels.support must be below current mid price; keyLevels.resistance must be above current mid price
- Confidence is 1 (very low) to 5 (very high)
- qualityScore is 0-100 and must reflect whether the setup is worth taking, not whether the market will be profitable
- Give high scores only when multi-timeframe bias, R:R, SL placement, execution timing, and spread/news risk are all acceptable
- tradeChecklist must contain 5 items in Vietnamese: multi-timeframe trend, entry timing, R:R, SL invalidation, and risk/news/spread warning
- Checklist status: "pass" = good condition, "warn" = acceptable but needs caution, "fail" = setup should likely be skipped or delayed
- Reasoning must be in Vietnamese, 3-5 concise sentences, written like an expert forex analyst. Include: bias, entry logic, SL invalidation, TP/risk-reward, and one caution
- For metals, energy, indices, and crypto, adjust SL/TP ranges proportionally to the asset price and do not reuse FX pip logic
- Never recommend confidence above 4 without very strong signals
- If the data is mixed, choose confidence 2-3 and say why
- If TradingView context is missing or incomplete, explicitly lower confidence and rely on the live quote snapshot
- This is NOT investment advice — this is educational analysis only
- Do not promise profit, certainty, or guaranteed outcomes

RESPONSE JSON SCHEMA:
{
  "direction": "LONG" | "SHORT",
  "entry": number,
  "stopLoss": number,
  "takeProfit": number,
  "confidence": 1-5,
  "qualityScore": 0-100,
  "tradeChecklist": [
    { "label": "string (Vietnamese)", "status": "pass" | "warn" | "fail", "detail": "string (Vietnamese)" }
  ],
  "reasoning": "string (Vietnamese)",
  "keyLevels": { "support": number, "resistance": number }
}

Respond ONLY with the JSON object, no markdown, no extra text.`;

function formatNumber(value: number | null, digits = 5) {
  if (value === null) return "n/a";
  return value.toFixed(value >= 100 ? 2 : digits);
}

function formatTradingViewContext(context?: TradingViewTechnicalContext | null) {
  if (!context) {
    return "TradingView technical context: unavailable. Use lower confidence and state that the plan is based mainly on the live quote snapshot.";
  }

  const frames = context.frames
    .map(
      (frame) =>
        `${frame.timeframe}: trend=${frame.trend}, recommendation=${formatNumber(frame.recommendation, 2)}, MA=${formatNumber(frame.maRecommendation, 2)}, oscillator=${formatNumber(frame.oscillatorRecommendation, 2)}, RSI=${formatNumber(frame.rsi, 1)} (${frame.rsiState}), EMA bias=${frame.emaBias}, EMA20=${formatNumber(frame.ema20)}, EMA50=${formatNumber(frame.ema50)}, EMA200=${formatNumber(frame.ema200)}, ATR=${formatNumber(frame.atr)}, ADX=${formatNumber(frame.adx, 1)}, MACD=${formatNumber(frame.macd)}, MACD signal=${formatNumber(frame.macdSignal)}, candle=${frame.candlePattern}, OHLC=${formatNumber(frame.open)}/${formatNumber(frame.high)}/${formatNumber(frame.low)}/${formatNumber(frame.close)}, volume=${formatNumber(frame.volume, 0)}, change=${formatNumber(frame.changePct, 2)}%`,
    )
    .join("\n");

  return `TradingView technical context:
Source: ${context.source}
TradingView Symbol: ${context.tradingViewSymbol}
Market Scanner: ${context.market}
Updated At: ${context.updatedAt}
Summary: ${context.summary}
${frames}`;
}

function formatNewsContext(context?: AiNewsContext | null) {
  if (!context) {
    return "Economic calendar news context: unavailable. Do not assume there is no news risk.";
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

export function buildUserPrompt(
  quote: QuoteRow,
  tradingViewContext?: TradingViewTechnicalContext | null,
  newsContext?: AiNewsContext | null,
): string {
  const mid = (quote.bid + quote.ask) / 2;
  const spread = quote.ask - quote.bid;
  const spreadPct = mid > 0 ? (spread / mid) * 100 : 0;

  return `Analyze this market like an expert forex analyst and provide a disciplined educational trading plan.

Symbol: ${quote.symbol}
Name: ${quote.name}
Group: ${quote.group}
Current Bid: ${quote.bid}
Current Ask: ${quote.ask}
Mid Price: ${mid.toFixed(quote.bid > 100 ? 2 : 5)}
Spread: ${spread.toFixed(quote.bid > 100 ? 2 : 5)}
Spread % of Mid: ${spreadPct.toFixed(4)}%
Change: ${quote.changePct >= 0 ? "+" : ""}${quote.changePct.toFixed(2)}%

${formatTradingViewContext(tradingViewContext)}

${formatNewsContext(newsContext)}

Return one conservative setup only. Include the trade checklist and quality score before the reasoning mentally, then write the reasoning like a professional forex expert explaining bias, execution, invalidation, target, and risk warning in Vietnamese.`;
}
