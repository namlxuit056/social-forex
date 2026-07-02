import type { AppLocale } from "@/lib/api-locale";
import { createAiClient, resolveAiProvider, resolveMaxTokens } from "@/lib/ai/provider";
import {
  aiPortfolioReviewSchema,
  sanitizeAiPortfolioReviewPayload,
  type AiPortfolioReview,
} from "@/lib/ai/types";

export type PortfolioReviewPosition = {
  ticket: string;
  symbol: string;
  type: string;
  volume: number | null;
  priceOpen: number | null;
  priceCurrent: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  profit: number | null;
};

export type PortfolioReviewAccount = {
  balance: number | null;
  equity: number | null;
  margin: number | null;
  freeMargin: number | null;
  currency: string | null;
};

export class AiPortfolioReviewUnavailableError extends Error {
  constructor(message = "AI portfolio review service unavailable") {
    super(message);
    this.name = "AiPortfolioReviewUnavailableError";
  }
}

function responseLanguage(locale: AppLocale) {
  return locale === "en"
    ? "English. Do not use Vietnamese words or Vietnamese sentence structure."
    : "Vietnamese.";
}

// Portfolio review is a lightweight, frequent-ish scan — use the faster/cheaper deepseek variant
function portfolioModel(resolved: NonNullable<ReturnType<typeof resolveAiProvider>>) {
  return resolved.provider === "deepseek" ? "deepseek-v4-flash" : resolved.model;
}

function buildSystemPrompt(locale: AppLocale) {
  return `You are a conservative senior risk manager reviewing a trader's currently open MT5 positions as one portfolio, not as isolated trades.

Response language: ${responseLanguage(locale)}

Rules:
- Analyze only the supplied account and position data. Do not invent price levels or news.
- Flag correlated/duplicate exposure: multiple positions long (or short) the same currency, or same-direction correlated pairs (e.g. EURUSD and GBPUSD both long).
- totalExposurePct = estimated loss if every stop loss is hit (or, for positions without a stop loss, a reasonable worst-case estimate), expressed as a percentage of account equity.
- A position with no stop loss is inherently higher risk — call this out explicitly.
- overallRiskLevel reflects totalExposurePct, correlation warnings, and margin usage together.
- For every position, give exactly one action: "hold" (setup still sound), "trim" (reduce size / take partial profit or loss), or "close" (exit now), with a short reason grounded in the supplied data (floating P&L, correlation, missing SL, lot size vs equity).
- This is educational risk review only, not investment advice. Do not promise outcomes.
- Return valid JSON only with this exact shape:
{
  "overallRiskLevel": "low" | "medium" | "high",
  "totalExposurePct": number,
  "summary": string,
  "correlationWarnings": string[],
  "positionAdvice": [ { "ticket": string, "symbol": string, "action": "hold" | "trim" | "close", "reason": string } ]
}`;
}

export async function getAiPortfolioReview({
  account,
  positions,
  locale,
}: {
  account: PortfolioReviewAccount;
  positions: PortfolioReviewPosition[];
  locale: AppLocale;
}): Promise<AiPortfolioReview> {
  const resolved = resolveAiProvider();
  if (!resolved) {
    throw new AiPortfolioReviewUnavailableError(
      "No AI API key configured. Add DEEPSEEK_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY to .env.",
    );
  }

  const client = createAiClient(resolved);

  const context = {
    account,
    positions: positions.map((p) => ({
      ticket: p.ticket,
      symbol: p.symbol,
      direction: p.type,
      volume: p.volume,
      entry: p.priceOpen,
      current: p.priceCurrent,
      stopLoss: p.stopLoss,
      takeProfit: p.takeProfit,
      floatingPnl: p.profit,
    })),
  };

  const response = await client.chat.completions.create({
    model: portfolioModel(resolved),
    ...(resolved.supportsTemperature ? { temperature: 0.2 } : {}),
    max_tokens: resolveMaxTokens(resolved, 1400),
    ...(resolved.supportsJsonResponseFormat ? { response_format: { type: "json_object" } } : {}),
    messages: [
      { role: "system", content: buildSystemPrompt(locale) },
      {
        role: "user",
        content: `Review this open MT5 portfolio and produce the JSON risk review.\n\n${JSON.stringify(context)}`,
      },
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

  const result = aiPortfolioReviewSchema.safeParse(sanitizeAiPortfolioReviewPayload(parsed));
  if (!result.success) {
    throw new Error(
      `Invalid AI response format: ${result.error.issues.map((i) => i.message).join(", ")}`,
    );
  }

  return result.data;
}
