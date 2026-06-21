import { aiSuggestionSchema, type AiSuggestion } from "@/lib/ai/types";
import { SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { createAiClient, resolveAiProvider } from "@/lib/ai/provider";
import { AiUnavailableError } from "@/lib/ai/suggest";

export type Mt5ChartPayload = {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  ohlcv: Array<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  }>;
  indicators?: {
    rsi14?: number;
    macd?: { macd: number; signal: number; histogram: number };
    ema20?: number;
    ema50?: number;
    ema200?: number;
    atr14?: number;
    bbUpper?: number;
    bbLower?: number;
    stochK?: number;
    stochD?: number;
  };
};

function formatNumber(value: number, digits = 5) {
  return value.toFixed(value >= 100 ? 2 : digits);
}

function buildMt5UserPrompt(payload: Mt5ChartPayload): string {
  const { symbol, timeframe, currentPrice, ohlcv, indicators } = payload;

  // Show last 10 candles
  const recentCandles = ohlcv.slice(-10);
  const candleLines = recentCandles
    .map((c) => {
      const t = new Date(c.time * 1000).toISOString();
      return `  ${t} O:${formatNumber(c.open)} H:${formatNumber(c.high)} L:${formatNumber(c.low)} C:${formatNumber(c.close)}${c.volume !== undefined ? ` V:${c.volume}` : ""}`;
    })
    .join("\n");

  const indicatorLines: string[] = [];
  if (indicators) {
    if (indicators.rsi14 !== undefined)
      indicatorLines.push(`RSI(14): ${indicators.rsi14.toFixed(2)}`);
    if (indicators.macd)
      indicatorLines.push(
        `MACD: ${formatNumber(indicators.macd.macd)} | Signal: ${formatNumber(indicators.macd.signal)} | Histogram: ${formatNumber(indicators.macd.histogram)}`,
      );
    if (indicators.ema20 !== undefined)
      indicatorLines.push(`EMA20: ${formatNumber(indicators.ema20)}`);
    if (indicators.ema50 !== undefined)
      indicatorLines.push(`EMA50: ${formatNumber(indicators.ema50)}`);
    if (indicators.ema200 !== undefined)
      indicatorLines.push(`EMA200: ${formatNumber(indicators.ema200)}`);
    if (indicators.atr14 !== undefined)
      indicatorLines.push(`ATR(14): ${formatNumber(indicators.atr14)}`);
    if (indicators.bbUpper !== undefined)
      indicatorLines.push(`BB Upper: ${formatNumber(indicators.bbUpper)}`);
    if (indicators.bbLower !== undefined)
      indicatorLines.push(`BB Lower: ${formatNumber(indicators.bbLower)}`);
    if (indicators.stochK !== undefined)
      indicatorLines.push(`Stoch %K: ${indicators.stochK.toFixed(2)}`);
    if (indicators.stochD !== undefined)
      indicatorLines.push(`Stoch %D: ${indicators.stochD.toFixed(2)}`);
  }

  return `Analyze this MT5 chart data like an expert forex analyst and provide a disciplined educational trading plan.

Response language: English. Do not use Vietnamese words or Vietnamese sentence structure in any user-facing field.

Symbol: ${symbol}
Timeframe: ${timeframe}
Current Price: ${formatNumber(currentPrice)}
Total Candles Available: ${ohlcv.length}

Last 10 Candles (OHLCV):
${candleLines}

${indicatorLines.length > 0 ? `Technical Indicators:\n${indicatorLines.join("\n")}` : "Technical Indicators: not provided"}

ENTRY CONSTRAINT: For LONG set entry strictly below ${formatNumber(currentPrice)} (current price). For SHORT set entry strictly above ${formatNumber(currentPrice)} (current price). This is mandatory — never set entry at or beyond current market price.

Based on the chart data and indicators above, return one conservative setup only. Include the trade checklist and quality score. Write the reasoning like a professional forex expert explaining bias, execution, invalidation, target, and risk warning in English.`;
}

export async function analyzeMt5Chart(
  payload: Mt5ChartPayload,
): Promise<AiSuggestion> {
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
      { role: "user", content: buildMt5UserPrompt(payload) },
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

  return result.data;
}
