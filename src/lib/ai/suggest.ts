import OpenAI from "openai";
import type { QuoteRow } from "@/lib/quotes/types";
import { aiSuggestionSchema, type AiSuggestion } from "@/lib/ai/types";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompt";
import type { TradingViewTechnicalContext } from "@/lib/ai/tradingview-context";
import type { AiNewsContext } from "@/lib/ai/news-context";

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_SCHEMA_VERSION = "checklist-v1";
const cache = new Map<string, { suggestion: AiSuggestion; at: number }>();

type AiProvider = "groq" | "openai";

const PROVIDER_CONFIG: Record<
  AiProvider,
  { baseURL: string; model: string; envKey: string }
> = {
  groq: {
    baseURL: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    envKey: "GROQ_API_KEY",
  },
  openai: {
    baseURL: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    envKey: "OPENAI_API_KEY",
  },
};

function resolveProvider(): { provider: AiProvider; apiKey: string } | null {
  const explicit = process.env.AI_PROVIDER?.toLowerCase() as AiProvider;

  if (explicit && PROVIDER_CONFIG[explicit]) {
    const key = process.env[PROVIDER_CONFIG[explicit].envKey]?.trim();
    if (key) return { provider: explicit, apiKey: key };
  }

  // auto-detect: try groq first (free), then openai
  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey) return { provider: "groq", apiKey: groqKey };

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) return { provider: "openai", apiKey: openaiKey };

  return null;
}

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
): Promise<AiSuggestion> {
  const cacheKey = `${CACHE_SCHEMA_VERSION}:${quote.symbol}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.suggestion;
  }

  const resolved = resolveProvider();
  if (!resolved) {
    throw new AiUnavailableError(
      "No AI API key configured. Add GROQ_API_KEY (free) or OPENAI_API_KEY to .env.",
    );
  }

  const config = PROVIDER_CONFIG[resolved.provider];
  const client = new OpenAI({
    apiKey: resolved.apiKey,
    baseURL: config.baseURL,
  });

  const response = await client.chat.completions.create({
    model: config.model,
    temperature: 0.3,
    max_tokens: 900,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(quote, tradingViewContext, newsContext) },
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
