import type { AppLocale } from "@/lib/api-locale";
import { createAiClient, resolveAiProvider, resolveMaxTokens } from "@/lib/ai/provider";
import {
  aiJournalAnalysisSchema,
  sanitizeAiJournalAnalysisPayload,
  type AiJournalAnalysis,
} from "@/lib/ai/types";

export type JournalAnalysisTrade = {
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
  openedAt: Date;
  closedAt: Date | null;
};

export class AiJournalAnalysisUnavailableError extends Error {
  constructor(message = "AI journal analysis service unavailable") {
    super(message);
    this.name = "AiJournalAnalysisUnavailableError";
  }
}

function responseLanguage(locale: AppLocale) {
  return locale === "en"
    ? "English. Do not use Vietnamese words or Vietnamese sentence structure."
    : "Vietnamese.";
}

function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  return [...map.entries()].map(([key, rows]) => ({ key, rows }));
}

function summarizeGroup(key: string, rows: JournalAnalysisTrade[]) {
  const closed = rows.filter((trade) => trade.result !== "PENDING");
  const wins = closed.filter((trade) => trade.result === "WIN").length;
  const losses = closed.filter((trade) => trade.result === "LOSS").length;
  const pnl = round(closed.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0));
  return {
    key,
    trades: rows.length,
    closed: closed.length,
    wins,
    losses,
    winRate: pct(wins, wins + losses),
    pnl,
  };
}

export function buildJournalAnalysisContext(trades: JournalAnalysisTrade[]) {
  const closed = trades.filter((trade) => trade.result !== "PENDING");
  const wins = closed.filter((trade) => trade.result === "WIN");
  const losses = closed.filter((trade) => trade.result === "LOSS");
  const breakevens = closed.filter((trade) => trade.result === "BREAKEVEN");
  const winningPnl = wins.reduce((sum, trade) => sum + Math.max(trade.pnl ?? 0, 0), 0);
  const losingPnl = losses.reduce((sum, trade) => sum + Math.abs(Math.min(trade.pnl ?? 0, 0)), 0);
  const totalPnl = closed.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);

  const symbolStats = groupBy(trades, (trade) => trade.symbol)
    .map(({ key, rows }) => summarizeGroup(key, rows))
    .sort((a, b) => b.closed - a.closed)
    .slice(0, 8);
  const directionStats = groupBy(trades, (trade) => trade.direction)
    .map(({ key, rows }) => summarizeGroup(key, rows))
    .sort((a, b) => b.closed - a.closed);

  return {
    totals: {
      trades: trades.length,
      closed: closed.length,
      pending: trades.length - closed.length,
      wins: wins.length,
      losses: losses.length,
      breakevens: breakevens.length,
      winRate: pct(wins.length, wins.length + losses.length),
      totalPnl: round(totalPnl),
      avgPnl: closed.length > 0 ? round(totalPnl / closed.length) : 0,
      avgWin: wins.length > 0 ? round(winningPnl / wins.length) : 0,
      avgLoss: losses.length > 0 ? round(losingPnl / losses.length) : 0,
      profitFactor: losingPnl > 0 ? round(winningPnl / losingPnl) : null,
      bestTrade: closed.length > 0 ? round(Math.max(...closed.map((trade) => trade.pnl ?? 0))) : null,
      worstTrade: closed.length > 0 ? round(Math.min(...closed.map((trade) => trade.pnl ?? 0))) : null,
    },
    symbolStats,
    directionStats,
    recentTrades: trades.slice(0, 80).map((trade) => ({
      symbol: trade.symbol,
      direction: trade.direction,
      result: trade.result,
      pnl: trade.pnl,
      lotSize: trade.lotSize,
      entry: trade.entry,
      stopLoss: trade.stopLoss,
      takeProfit: trade.takeProfit,
      exitPrice: trade.exitPrice,
      openedAt: trade.openedAt.toISOString(),
      closedAt: trade.closedAt?.toISOString() ?? null,
      notes: trade.notes?.slice(0, 280) ?? null,
    })),
  };
}

function buildSystemPrompt(locale: AppLocale) {
  return `You are a conservative senior trading journal coach for forex, metals and CFD learners.

Response language: ${responseLanguage(locale)}

Rules:
- Analyze only the supplied journal data. If evidence is thin, say so clearly.
- Educational coaching only. Do not promise profit or give a command to buy/sell.
- Focus on process quality, risk consistency, repeated mistakes, symbol/direction bias, expectancy, and review habits.
- Be direct but supportive, like a professional mentor reviewing a trader's log.
- Return valid JSON only with this exact shape:
{
  "score": number from 0 to 100,
  "summary": string,
  "strengths": string[],
  "improvementAreas": [
    { "title": string, "priority": "high" | "medium" | "low", "evidence": string, "action": string }
  ],
  "riskFlags": string[],
  "patternInsights": string[],
  "nextReviewPlan": string[]
}`;
}

export async function getAiJournalAnalysis({
  trades,
  locale,
}: {
  trades: JournalAnalysisTrade[];
  locale: AppLocale;
}): Promise<AiJournalAnalysis> {
  const resolved = await resolveAiProvider();
  if (!resolved) {
    throw new AiJournalAnalysisUnavailableError(
      "No AI API key configured. Add GROQ_API_KEY or OPENAI_API_KEY to .env.",
    );
  }

  const client = createAiClient(resolved);
  const context = buildJournalAnalysisContext(trades);

  const response = await client.chat.completions.create({
    model: resolved.model,
    ...(resolved.supportsTemperature ? { temperature: 0.25 } : {}),
    max_tokens: resolveMaxTokens(resolved, 2000),
    ...(resolved.supportsJsonResponseFormat ? { response_format: { type: "json_object" } } : {}),
    messages: [
      { role: "system", content: buildSystemPrompt(locale) },
      {
        role: "user",
        content: `Review this trading journal dataset and produce the JSON analysis.\n\n${JSON.stringify(context)}`,
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

  const result = aiJournalAnalysisSchema.safeParse(sanitizeAiJournalAnalysisPayload(parsed));
  if (!result.success) {
    throw new Error(
      `Invalid AI response format: ${result.error.issues.map((issue) => issue.message).join(", ")}`,
    );
  }

  return result.data;
}
