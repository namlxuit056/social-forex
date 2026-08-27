import type { AppLocale } from "@/lib/api-locale";
import { createAiClient, resolveAiProvider, resolveMaxTokens } from "@/lib/ai/provider";
import { responseLanguage } from "@/lib/ai/prompt";
import { realizedR } from "@/lib/journal/r-multiple";
import {
  aiTradeReviewSchema,
  sanitizeAiTradeReviewPayload,
  type AiTradeReviewResult,
} from "@/lib/ai/types";

export class AiTradeReviewUnavailableError extends Error {
  constructor(message = "AI trade review service unavailable") {
    super(message);
    this.name = "AiTradeReviewUnavailableError";
  }
}

export type TradeForReview = {
  symbol: string;
  direction: string;
  entry: number;
  stopLoss: number | null;
  takeProfit: number | null;
  exitPrice: number | null;
  lotSize: number | null;
  result: string;
  pnl: number | null;
  notes: string | null;
  setup: string | null;
  emotion: string | null;
  openedAt: Date;
  closedAt: Date | null;
  overrodeDailyLimit: boolean;
  overrodeLossStreakGuard: boolean;
};

export type DayPlanForReview = {
  maxTrades: number | null;
  tradesLoggedThatDay: number;
  bias: string | null;
  keyLevels: string | null;
  newsToAvoid: string | null;
  checklistDone: number;
  checklistTotal: number;
} | null;

export type BestSetupForReview = {
  setup: string;
  winRate: number;
  total: number;
} | null;

export type TradeReviewContext = {
  trade: {
    symbol: string;
    direction: string;
    result: string;
    entry: number;
    stopLoss: number | null;
    takeProfit: number | null;
    exitPrice: number | null;
    lotSize: number | null;
    pnl: number | null;
    realizedR: number | null;
    plannedRR: number | null;
    hadStopLoss: boolean;
    hadTakeProfit: boolean;
    setup: string | null;
    emotion: string | null;
    notes: string | null;
    holdMinutes: number | null;
  };
  plan: DayPlanForReview;
  bestSetup: BestSetupForReview;
  priorLossStreak: number;
  facts: string[];
};

function round(value: number) {
  return Math.round(value * 100) / 100;
}

/** Planned reward:risk = |TP − entry| / |entry − SL|, null if SL/TP missing or SL == entry. */
export function plannedRR(t: {
  direction: string;
  entry: number;
  stopLoss: number | null;
  takeProfit: number | null;
}): number | null {
  if (t.stopLoss === null || t.takeProfit === null) return null;
  const risk = Math.abs(t.entry - t.stopLoss);
  if (risk === 0) return null;
  return round(Math.abs(t.takeProfit - t.entry) / risk);
}

/**
 * Pure builder: turns one closed trade + that day's plan context into a compact
 * structure plus a list of plain-language "facts" the AI must ground its review in.
 * No AI call, no I/O — unit-tested.
 */
export function buildTradeReviewContext({
  trade,
  plan,
  bestSetup,
  priorLossStreak,
}: {
  trade: TradeForReview;
  plan: DayPlanForReview;
  bestSetup: BestSetupForReview;
  priorLossStreak: number;
}): TradeReviewContext {
  const r = realizedR(trade);
  const rr = plannedRR(trade);
  const holdMinutes =
    trade.closedAt && trade.openedAt
      ? Math.max(0, Math.round((trade.closedAt.getTime() - trade.openedAt.getTime()) / 60000))
      : null;

  const facts: string[] = [];

  if (!trade.stopLoss) {
    facts.push("No stop loss was recorded for this trade — risk was uncapped.");
  } else if (rr !== null) {
    facts.push(`Planned reward:risk was ${rr.toFixed(2)}:1.`);
  }
  if (!trade.takeProfit) {
    facts.push("No take profit target was recorded.");
  }
  if (r !== null) {
    facts.push(`Realized outcome was ${r >= 0 ? "+" : ""}${r.toFixed(2)}R.`);
  }
  if (trade.overrodeDailyLimit) {
    facts.push("Trader overrode the daily trade-limit warning to log this trade.");
  }
  if (trade.overrodeLossStreakGuard) {
    facts.push("Trader overrode the revenge-trading cooldown to place this trade.");
  }
  if (priorLossStreak >= 2) {
    facts.push(
      `This trade followed a losing streak of ${priorLossStreak} trades in the prior 24h.`,
    );
  }
  if (trade.emotion) {
    facts.push(`Trader tagged their emotional state as "${trade.emotion}".`);
  }
  if (!trade.setup) {
    facts.push("No setup/strategy tag was attached — the trade rationale is undocumented.");
  } else if (bestSetup && bestSetup.setup !== trade.setup) {
    facts.push(
      `Setup used was "${trade.setup}", not the trader's best-performing setup "${bestSetup.setup}" (${bestSetup.winRate}% win rate over ${bestSetup.total} trades).`,
    );
  } else if (bestSetup && bestSetup.setup === trade.setup) {
    facts.push(
      `Setup used ("${trade.setup}") is the trader's best-performing setup (${bestSetup.winRate}% win rate).`,
    );
  }
  if (!trade.notes || trade.notes.trim().length < 15) {
    facts.push("Trade notes are missing or too thin to reconstruct the decision later.");
  }
  if (plan) {
    if (plan.maxTrades !== null && plan.tradesLoggedThatDay > plan.maxTrades) {
      facts.push(
        `Trader's own daily plan capped trades at ${plan.maxTrades}; ${plan.tradesLoggedThatDay} were logged that day.`,
      );
    }
    if (plan.checklistTotal > 0 && plan.checklistDone < plan.checklistTotal) {
      facts.push(
        `Pre-trade checklist was only ${plan.checklistDone}/${plan.checklistTotal} complete that day.`,
      );
    }
    if (plan.bias && plan.bias !== "WAIT") {
      const dirBias = trade.direction === "LONG" ? "LONG" : "SHORT";
      const planBias = plan.bias === "BULLISH" ? "LONG" : plan.bias === "BEARISH" ? "SHORT" : null;
      if (planBias && planBias !== dirBias) {
        facts.push(
          `Trade direction (${dirBias}) contradicts the day plan's stated bias (${plan.bias}).`,
        );
      }
    }
    if (plan.newsToAvoid && plan.newsToAvoid.trim()) {
      facts.push(`Day plan flagged news to avoid: "${plan.newsToAvoid.trim().slice(0, 160)}".`);
    }
  } else {
    facts.push("No day trading plan existed for the day this trade was opened.");
  }

  return {
    trade: {
      symbol: trade.symbol,
      direction: trade.direction,
      result: trade.result,
      entry: trade.entry,
      stopLoss: trade.stopLoss,
      takeProfit: trade.takeProfit,
      exitPrice: trade.exitPrice,
      lotSize: trade.lotSize,
      pnl: trade.pnl,
      realizedR: r,
      plannedRR: rr,
      hadStopLoss: trade.stopLoss !== null,
      hadTakeProfit: trade.takeProfit !== null,
      setup: trade.setup,
      emotion: trade.emotion,
      notes: trade.notes ? trade.notes.slice(0, 400) : null,
      holdMinutes,
    },
    plan,
    bestSetup,
    priorLossStreak,
    facts,
  };
}

function buildSystemPrompt(locale: AppLocale) {
  return `You are a strict but supportive trading-process coach. You review ONE just-closed trade and grade the trader's DISCIPLINE and PROCESS QUALITY — not whether it won or lost. A disciplined losing trade scores well; a reckless winner scores poorly.

Response language: ${responseLanguage(locale)}

Rules:
- Judge only from the supplied data and the "facts" list. Never invent price levels, indicators, or news.
- Weigh: stop-loss discipline, planned reward:risk, adherence to the trader's own day plan (trade cap, checklist, bias, news-to-avoid), setup documentation vs the trader's best setup, emotional state, whether risk guards were overridden, and note quality.
- score: 0-100 process score. verdict: "disciplined" (>=75), "acceptable" (45-74), "undisciplined" (<45) — keep consistent with the score.
- wentRight / wentWrong: 0-4 short bullet points each, concrete and tied to the facts. Omit a list (empty array) if nothing applies.
- disciplineFlags: 0-4 short flags for rule violations only (no SL, overrode a guard, over daily cap, traded against plan bias, revenge trade). Empty array if none.
- nextAction: one concrete, specific thing to do on the next trade.
- Educational coaching only. No profit promises, no buy/sell calls.
- Return valid JSON only with this exact shape:
{
  "score": number 0-100,
  "verdict": "disciplined" | "acceptable" | "undisciplined",
  "summary": string (1-2 sentences),
  "wentRight": string[],
  "wentWrong": string[],
  "disciplineFlags": string[],
  "nextAction": string
}`;
}

export async function getAiTradeReview({
  context,
  locale,
}: {
  context: TradeReviewContext;
  locale: AppLocale;
}): Promise<AiTradeReviewResult> {
  const resolved = await resolveAiProvider();
  if (!resolved) {
    throw new AiTradeReviewUnavailableError(
      "No AI API key configured. Add DEEPSEEK_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY to .env.",
    );
  }

  const client = createAiClient(resolved);

  const response = await client.chat.completions.create({
    model: resolved.model,
    ...(resolved.supportsTemperature ? { temperature: 0.25 } : {}),
    max_tokens: resolveMaxTokens(resolved, 800),
    ...(resolved.supportsJsonResponseFormat ? { response_format: { type: "json_object" } } : {}),
    messages: [
      { role: "system", content: buildSystemPrompt(locale) },
      {
        role: "user",
        content: `Review this single closed trade and produce the JSON discipline report.\n\n${JSON.stringify(context)}`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("AI returned an empty response");

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

  const result = aiTradeReviewSchema.safeParse(sanitizeAiTradeReviewPayload(parsed));
  if (!result.success) {
    throw new Error(
      `Invalid AI response format: ${result.error.issues.map((i) => i.message).join(", ")}`,
    );
  }

  return result.data;
}
