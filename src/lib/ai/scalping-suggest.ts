import type { QuoteRow } from "@/lib/quotes/types";
import { aiSuggestionSchema, sanitizeAiSuggestionPayload, type AiSuggestion } from "@/lib/ai/types";
import { SCALPING_SYSTEM_PROMPT, buildScalpingUserPrompt } from "@/lib/ai/scalping-prompt";
import type { ScalpingTechnicalContext } from "@/lib/ai/scalping-tradingview-context";
import type { AiNewsContext } from "@/lib/ai/news-context";
import type { AppLocale } from "@/lib/api-locale";
import { createAiClient, resolveAiProvider } from "@/lib/ai/provider";
import { AiUnavailableError } from "@/lib/ai/suggest";

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 min — scalping needs fresher analysis
const CACHE_SCHEMA_VERSION = "scalping-v1";
const cache = new Map<string, { suggestion: AiSuggestion; at: number }>();

export async function getScalpingAiSuggestion(
  quote: QuoteRow,
  scalpingContext?: ScalpingTechnicalContext | null,
  newsContext?: AiNewsContext | null,
  locale: AppLocale = "vi",
): Promise<AiSuggestion> {
  const cacheKey = `${CACHE_SCHEMA_VERSION}:${locale}:${quote.symbol}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.suggestion;
  }

  const resolved = await resolveAiProvider();
  if (!resolved) {
    throw new AiUnavailableError(
      "No AI API key configured. Add GROQ_API_KEY (free) or OPENAI_API_KEY to .env.",
    );
  }

  const client = createAiClient(resolved);

  const response = await client.chat.completions.create({
    model: resolved.model,
    ...(resolved.supportsTemperature ? { temperature: 0.2 } : {}),
    max_tokens: resolved.maxTokens,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SCALPING_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildScalpingUserPrompt(quote, scalpingContext, newsContext, locale),
      },
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

  const result = aiSuggestionSchema.safeParse(sanitizeAiSuggestionPayload(parsed));
  if (!result.success) {
    throw new Error(
      `Invalid AI scalping response: ${result.error.issues.map((i) => i.message).join(", ")}`,
    );
  }

  cache.set(cacheKey, { suggestion: result.data, at: Date.now() });
  return result.data;
}
