import type { AppLocale } from "@/lib/api-locale";
import { createAiClient, resolveAiProvider, resolveMaxTokens } from "@/lib/ai/provider";
import {
  aiPositionReviewSchema,
  sanitizeAiPositionReviewPayload,
  type AiPositionReview,
} from "@/lib/ai/types";
import {
  getTradingViewTechnicalContext,
  type TradingViewTechnicalContext,
} from "@/lib/ai/tradingview-context";
import { getAiNewsContext, type AiNewsContext } from "@/lib/ai/news-context";
import { responseLanguage, formatTradingViewContext, formatNewsContext } from "@/lib/ai/prompt";
import { detectGroup } from "@/lib/ai/tv-chart-analyze";

export class AiPositionReviewUnavailableError extends Error {
  constructor(message = "AI position review service unavailable") {
    super(message);
    this.name = "AiPositionReviewUnavailableError";
  }
}

export type OpenPositionForReview = {
  ticket: string;
  symbol: string;
  isBuy: boolean;
  volume: number | null;
  entry: number | null;
  current: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  floatingPnl: number | null;
};

function buildSystemPrompt(locale: AppLocale) {
  return `You are a conservative senior technical analyst reviewing ONE already-open MT5 position for a trader who wants to know whether the original trade thesis still holds.

Response language: ${responseLanguage(locale)}

Rules:
- Base your call only on the supplied position data, TradingView multi-timeframe technical context, and news context. Do not invent price levels or news.
- Weigh D1, H4, H1, M15 together the same way an expert would: D1 sets the strategic bias, H4 confirms structure, H1/M15 time the move.
- trendAlignment describes whether the CURRENT technical trend still agrees with the position's own direction (buy = bullish thesis, sell = bearish thesis): "bullish", "bearish", or "neutral".
- action is exactly one of "hold" (thesis and trend still intact), "trim" (reduce size / lock partial profit, momentum fading or mixed signals), or "close" (trend has reversed against the position or invalidation level breached).
- If trendAlignment contradicts the position's own direction, action should usually be "trim" or "close" unless there is a strong specific reason to hold.
- Factor in floating P/L, existing stop loss / take profit placement, and whether SL is missing (higher urgency to protect).
- invalidationLevel (optional): the price level where, if broken, the original setup is clearly invalid — set it only when a clear technical level is present.
- This is educational risk review only, not investment advice. Do not promise outcomes.
- summary: one or two sentences, plain language verdict. reasoning: 3-5 concise sentences citing specific technical facts (trend/RSI/EMA/S-R/momentum) tied to the position's direction.
- Return valid JSON only with this exact shape:
{
  "action": "hold" | "trim" | "close",
  "trendAlignment": "bullish" | "bearish" | "neutral",
  "confidence": 1-5,
  "summary": string,
  "reasoning": string,
  "invalidationLevel": number (optional)
}`;
}

function buildUserPrompt(
  position: OpenPositionForReview,
  tvContext: TradingViewTechnicalContext | null,
  newsContext: AiNewsContext | null,
  locale: AppLocale,
): string {
  return `Review this already-open MT5 position and decide whether to hold, trim, or close it.

Response language: ${responseLanguage(locale)}

Symbol: ${position.symbol}
Direction: ${position.isBuy ? "BUY (long)" : "SELL (short)"}
Volume (lots): ${position.volume ?? "n/a"}
Entry price: ${position.entry ?? "n/a"}
Current price: ${position.current ?? "n/a"}
Stop loss: ${position.stopLoss && position.stopLoss > 0 ? position.stopLoss : "not set"}
Take profit: ${position.takeProfit && position.takeProfit > 0 ? position.takeProfit : "not set"}
Floating P/L: ${position.floatingPnl ?? "n/a"}

${formatTradingViewContext(tvContext)}

${formatNewsContext(newsContext)}

Decide if the technical trend still supports holding this specific position, and return the JSON verdict.`;
}

export async function getAiPositionReview({
  position,
  locale,
}: {
  position: OpenPositionForReview;
  locale: AppLocale;
}): Promise<{ review: AiPositionReview; tvContext: TradingViewTechnicalContext | null }> {
  const resolved = resolveAiProvider();
  if (!resolved) {
    throw new AiPositionReviewUnavailableError(
      "No AI API key configured. Add DEEPSEEK_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY to .env.",
    );
  }

  const group = detectGroup(position.symbol);
  const fallbackPrice = position.current ?? position.entry ?? 0;

  const [tvContext, newsContext] = await Promise.all([
    getTradingViewTechnicalContext({
      symbol: position.symbol,
      group,
      bid: fallbackPrice,
      ask: fallbackPrice,
      name: position.symbol,
      changePct: 0,
    }).catch(() => null),
    getAiNewsContext(position.symbol).catch(() => null),
  ]);

  const client = createAiClient(resolved);

  const response = await client.chat.completions.create({
    model: resolved.model,
    ...(resolved.supportsTemperature ? { temperature: 0.2 } : {}),
    max_tokens: resolveMaxTokens(resolved, 900),
    ...(resolved.supportsJsonResponseFormat ? { response_format: { type: "json_object" } } : {}),
    messages: [
      { role: "system", content: buildSystemPrompt(locale) },
      { role: "user", content: buildUserPrompt(position, tvContext, newsContext, locale) },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("AI returned an empty response");

  // Strip <think>...</think> blocks (DeepSeek reasoning output)
  const stripped = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  const jsonStr = stripped.includes("```")
    ? (stripped.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? stripped).trim()
    : stripped;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error("AI response is not valid JSON");
  }

  const result = aiPositionReviewSchema.safeParse(sanitizeAiPositionReviewPayload(parsed));
  if (!result.success) {
    throw new Error(
      `Invalid AI response format: ${result.error.issues.map((i) => i.message).join(", ")}`,
    );
  }

  return { review: result.data, tvContext };
}
