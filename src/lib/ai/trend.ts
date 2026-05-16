import { z } from "zod";
import type { AppLocale } from "@/lib/api-locale";
import type { TradingViewTechnicalContext } from "@/lib/ai/tradingview-context";
import { createAiClient, resolveAiProvider } from "@/lib/ai/provider";
import type { QuoteRow } from "@/lib/quotes/types";

const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_SCHEMA_VERSION = "daily-trend-v1";
const cache = new Map<string, { trend: AiDailyTrend; at: number }>();

export const aiDailyTrendSchema = z.object({
  direction: z.enum(["UP", "DOWN"]),
  confidence: z.number().min(1).max(5),
  summary: z.string().min(10).max(280),
  invalidation: z.string().min(6).max(180),
});

export type AiDailyTrend = z.infer<typeof aiDailyTrendSchema>;

export type AiDailyTrendResponse = {
  symbol: string;
  trend: AiDailyTrend;
  generatedAt: string;
  disclaimer: string;
};

function responseLanguage(locale: AppLocale) {
  return locale === "en"
    ? "English. Do not use Vietnamese words or Vietnamese sentence structure."
    : "Vietnamese.";
}

function formatNumber(value: number | null, digits = 5) {
  if (value === null) return "n/a";
  return value.toFixed(value >= 100 ? 2 : digits);
}

function formatContext(context?: TradingViewTechnicalContext | null) {
  if (!context) {
    return "TradingView technical context: unavailable. Lower confidence and base the trend only on the live quote snapshot.";
  }

  return `TradingView technical context:
${context.summary}
${context.frames
  .map(
    (frame) =>
      `${frame.timeframe}: trend=${frame.trend}, recommendation=${formatNumber(frame.recommendation, 2)}, MA=${formatNumber(frame.maRecommendation, 2)}, oscillator=${formatNumber(frame.oscillatorRecommendation, 2)}, RSI=${formatNumber(frame.rsi, 1)} (${frame.rsiState}), EMA=${frame.emaBias}, ATR=${formatNumber(frame.atr)}, ADX=${formatNumber(frame.adx, 1)}, candle=${frame.candlePattern}, change=${formatNumber(frame.changePct, 2)}%`,
  )
  .join("\n")}`;
}

function buildPrompt(
  quote: QuoteRow,
  context: TradingViewTechnicalContext | null | undefined,
  locale: AppLocale,
) {
  const mid = (quote.bid + quote.ask) / 2;
  const spread = quote.ask - quote.bid;

  return `Give a same-day directional market view for this symbol. This is educational only, not investment advice.

Response language: ${responseLanguage(locale)}

Symbol: ${quote.symbol}
Name: ${quote.name}
Group: ${quote.group}
Bid: ${quote.bid}
Ask: ${quote.ask}
Mid: ${mid.toFixed(quote.bid > 100 ? 2 : 5)}
Spread: ${spread.toFixed(quote.bid > 100 ? 2 : 5)}
Current change: ${quote.changePct >= 0 ? "+" : ""}${quote.changePct.toFixed(2)}%

${formatContext(context)}

Decide whether price is more likely to rise or fall during today's session. Weigh H4 for broad bias, H1 for intraday trend quality, and M15 for timing. If evidence is mixed, still choose the more likely side but use confidence 1-2 and say it is mixed.

Return only valid JSON:
{
  "direction": "UP" | "DOWN",
  "confidence": 1-5,
  "summary": "one concise analyst sentence in the requested language",
  "invalidation": "short condition that would invalidate this view in the requested language"
}`;
}

export class AiTrendUnavailableError extends Error {
  constructor(message = "AI trend service unavailable") {
    super(message);
    this.name = "AiTrendUnavailableError";
  }
}

export async function getAiDailyTrend(
  quote: QuoteRow,
  context?: TradingViewTechnicalContext | null,
  locale: AppLocale = "vi",
): Promise<AiDailyTrend> {
  const cacheKey = `${CACHE_SCHEMA_VERSION}:${locale}:${quote.symbol}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.trend;
  }

  const resolved = resolveAiProvider();
  if (!resolved) {
    throw new AiTrendUnavailableError(
      "No AI API key configured. Add GROQ_API_KEY or OPENAI_API_KEY to .env.",
    );
  }

  const client = createAiClient(resolved);
  const response = await client.chat.completions.create({
    model: resolved.model,
    temperature: 0.2,
    max_tokens: 260,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a conservative intraday forex analyst. Respond only with JSON matching the requested schema. Do not promise profit or certainty.",
      },
      { role: "user", content: buildPrompt(quote, context, locale) },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("AI returned an empty response");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI response is not valid JSON");
  }

  const result = aiDailyTrendSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Invalid AI response format: ${result.error.issues.map((i) => i.message).join(", ")}`,
    );
  }

  cache.set(cacheKey, { trend: result.data, at: Date.now() });
  return result.data;
}
