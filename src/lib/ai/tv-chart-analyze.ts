import { aiSuggestionSchema, sanitizeAiSuggestionPayload, type AiSuggestion } from "@/lib/ai/types";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompt";
import { createAiClient, resolveAiProvider } from "@/lib/ai/provider";
import { AiUnavailableError } from "@/lib/ai/suggest";
import {
  getTradingViewTechnicalContext,
  type TradingViewTechnicalContext,
} from "@/lib/ai/tradingview-context";
import { getAiNewsContext } from "@/lib/ai/news-context";
import type { QuoteGroup } from "@/lib/quotes/types";

function detectGroup(symbol: string): QuoteGroup {
  const s = symbol.toUpperCase();
  if (s.includes("XAU") || s.includes("XAG")) return "metal";
  if (s.includes("OIL") || s.includes("GAS") || s === "USOIL" || s === "UKOIL") return "energy";
  if (
    s.startsWith("BTC") ||
    s.startsWith("ETH") ||
    s.startsWith("BNB") ||
    s.includes("USDT") ||
    s.includes("USDC")
  )
    return "crypto";
  return "major";
}

export async function analyzeTvChart(
  symbol: string,
  fallbackPrice: number,
  locale: "vi" | "en" = "vi",
): Promise<{ suggestion: AiSuggestion; tvContext: TradingViewTechnicalContext }> {
  const resolved = resolveAiProvider();
  if (!resolved) {
    throw new AiUnavailableError(
      "No AI API key configured. Add DEEPSEEK_API_KEY (recommended), GROQ_API_KEY, or OPENAI_API_KEY to .env.",
    );
  }

  const group = detectGroup(symbol);

  const [tvContext, newsContext] = await Promise.all([
    getTradingViewTechnicalContext({
      symbol,
      group,
      bid: fallbackPrice,
      ask: fallbackPrice,
      name: symbol,
      changePct: 0,
    }),
    getAiNewsContext(symbol),
  ]);

  if (!tvContext) {
    throw new Error(`TradingView data not available for ${symbol}`);
  }

  // Use TradingView M15 close as the authoritative current price
  const m15Frame = tvContext.frames.find((f) => f.timeframe === "M15");
  const livePrice = m15Frame?.close ?? fallbackPrice;

  const quote = {
    symbol,
    name: symbol,
    group,
    bid: livePrice,
    ask: livePrice,
    changePct: m15Frame?.changePct ?? 0,
  };

  const prompt = buildUserPrompt(quote, tvContext, newsContext, locale);

  const client = createAiClient(resolved);

  const response = await client.chat.completions.create({
    model: resolved.model,
    ...(resolved.supportsTemperature ? { temperature: 0.3 } : {}),
    max_tokens: resolved.maxTokens,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("AI returned empty response");
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
      `Invalid AI response format: ${result.error.issues.map((i) => i.message).join(", ")}`,
    );
  }

  return { suggestion: result.data, tvContext };
}
