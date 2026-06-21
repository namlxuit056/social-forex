import { aiSuggestionSchema, type AiSuggestion } from "@/lib/ai/types";
import { SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { createAiClient, resolveAiProvider } from "@/lib/ai/provider";
import { AiUnavailableError } from "@/lib/ai/suggest";
import {
  getTradingViewTechnicalContext,
  type TradingViewTechnicalContext,
} from "@/lib/ai/tradingview-context";
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
  // Default to major forex
  return "major";
}

function fmt(value: number | null, digits = 5) {
  if (value === null) return "n/a";
  return value.toFixed(value >= 100 ? 2 : digits);
}

function buildTvPrompt(
  symbol: string,
  currentPrice: number,
  ctx: TradingViewTechnicalContext,
): string {
  const frameLines = ctx.frames
    .map((f) => {
      return [
        `[${f.timeframe}]`,
        `trend=${f.trend}`,
        `rec=${fmt(f.recommendation, 2)}`,
        `rsi=${fmt(f.rsi, 1)}(${f.rsiState})`,
        `ema20=${fmt(f.ema20)}`,
        `ema50=${fmt(f.ema50)}`,
        `ema200=${fmt(f.ema200)}`,
        `adx=${fmt(f.adx, 1)}`,
        `macd=${fmt(f.macd)}`,
        `sig=${fmt(f.macdSignal)}`,
        `emaBias=${f.emaBias}`,
        `candle=${f.candlePattern}`,
        `O=${fmt(f.open)} H=${fmt(f.high)} L=${fmt(f.low)} C=${fmt(f.close)}`,
      ].join(" ");
    })
    .join("\n");

  return `Analyze this TradingView multi-timeframe technical data and provide a disciplined educational trading plan.

Response language: English. Do not use Vietnamese in any field.

Symbol: ${symbol}
Current Price: ${currentPrice.toFixed(5)}
Data source: TradingView Scanner (real-time, ${ctx.updatedAt})

Multi-Timeframe Summary:
${frameLines}

Overall: ${ctx.summary}

ENTRY CONSTRAINT: For LONG entry MUST be strictly below ${currentPrice.toFixed(5)}. For SHORT entry MUST be strictly above ${currentPrice.toFixed(5)}.

Return one conservative setup only. JSON format, no markdown.`;
}

export async function analyzeTvChart(
  symbol: string,
  currentPrice: number,
): Promise<{ suggestion: AiSuggestion; tvContext: TradingViewTechnicalContext }> {
  const resolved = resolveAiProvider();
  if (!resolved) {
    throw new AiUnavailableError(
      "No AI API key configured. Add DEEPSEEK_API_KEY (recommended), GROQ_API_KEY, or OPENAI_API_KEY to .env.",
    );
  }

  const group = detectGroup(symbol);
  const tvContext = await getTradingViewTechnicalContext({
    symbol,
    group,
    bid: currentPrice,
    ask: currentPrice,
    name: symbol,
    changePct: 0,
  });

  if (!tvContext) {
    throw new Error(`TradingView data not available for ${symbol}`);
  }

  const client = createAiClient(resolved);
  const prompt = buildTvPrompt(symbol, currentPrice, tvContext);

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

  const result = aiSuggestionSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Invalid AI response format: ${result.error.issues.map((i) => i.message).join(", ")}`,
    );
  }

  return { suggestion: result.data, tvContext };
}
