import type { QuoteRow } from "@/lib/quotes/types";
import { aiSuggestionSchema, type AiSuggestion } from "@/lib/ai/types";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompt";
import type { TradingViewTechnicalContext } from "@/lib/ai/tradingview-context";
import type { AiNewsContext } from "@/lib/ai/news-context";
import type { AppLocale } from "@/lib/api-locale";
import { createAiClient, resolveAiProvider } from "@/lib/ai/provider";

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_SCHEMA_VERSION = "localized-checklist-v1";
const cache = new Map<string, { suggestion: AiSuggestion; at: number }>();

export class AiUnavailableError extends Error {
  constructor(message = "AI service unavailable") {
    super(message);
    this.name = "AiUnavailableError";
  }
}

export async function getAiSuggestion(
  quote: QuoteRow,
  tradingViewContext?: TradingViewTechnicalContext | null,
  newsContext?: AiNewsContext | null,
  locale: AppLocale = "vi",
): Promise<AiSuggestion> {
  const cacheKey = `${CACHE_SCHEMA_VERSION}:${locale}:${quote.symbol}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.suggestion;
  }

  const resolved = resolveAiProvider();
  if (!resolved) {
    throw new AiUnavailableError(
      "No AI API key configured. Add GROQ_API_KEY (free) or OPENAI_API_KEY to .env.",
    );
  }

  const client = createAiClient(resolved);

  const response = await client.chat.completions.create({
    model: resolved.model,
    ...(resolved.supportsTemperature ? { temperature: 0.3 } : {}),
    max_tokens: resolved.maxTokens,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(quote, tradingViewContext, newsContext, locale) },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("AI returned an empty response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI response is not valid JSON");
  }

  const result = aiSuggestionSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Invalid AI response format: ${result.error.issues.map((i) => i.message).join(", ")}`,
    );
  }

  cache.set(cacheKey, { suggestion: result.data, at: Date.now() });
  return result.data;
}
