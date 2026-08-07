import { prisma } from "@/lib/prisma";
import { resolveQuotes } from "@/lib/quotes/resolve-quotes";
import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";
import { getTradingViewTechnicalContext } from "@/lib/ai/tradingview-context";
import { getAiSuggestion, AiUnavailableError } from "@/lib/ai/suggest";
import type { QuoteRow } from "@/lib/quotes/types";
import { SCREENER_AUTO_TIMEFRAME } from "@/lib/signals/create-screener-signal";
import { SCREENER_AUTO_FIRE_MIN_SCORE } from "@/lib/signals/screener-auto-fire";

export type ScreenerReviewResult = {
  proposalId: string;
  symbol: string;
  status: "kept" | "invalidated" | "check_failed";
  reason?: string;
};

async function reviewProposal(
  proposal: { id: string; symbol: string; direction: string; signalId: string | null },
  quoteRows: QuoteRow[],
): Promise<ScreenerReviewResult> {
  const base = { proposalId: proposal.id, symbol: proposal.symbol };

  const def = QUOTE_DEFINITIONS.find((d) => d.symbol === proposal.symbol);
  const quote = quoteRows.find((q) => q.symbol === proposal.symbol);
  if (!def || !quote) return { ...base, status: "check_failed", reason: "symbol_not_found" };

  let ai;
  try {
    const tv = await getTradingViewTechnicalContext(quote).catch(() => null);
    ai = await getAiSuggestion(quote, tv, null, "vi");
  } catch (err) {
    return { ...base, status: "check_failed", reason: err instanceof AiUnavailableError ? "ai_unavailable" : "ai_error" };
  }

  const stillValid = ai.direction === proposal.direction && ai.qualityScore >= SCREENER_AUTO_FIRE_MIN_SCORE;
  if (stillValid) {
    return { ...base, status: "kept" };
  }

  await prisma.aiTradeProposal.update({
    where: { id: proposal.id },
    data: { status: "REJECTED", rejectedAt: new Date() },
  });

  if (proposal.signalId) {
    await prisma.signal.updateMany({
      where: { id: proposal.signalId, status: { in: ["ACTIVE", "PENDING"] } },
      data: { status: "CANCELLED", closedAt: new Date() },
    });
  }

  const reason =
    ai.direction !== proposal.direction ? `direction_flipped_${ai.direction}` : `score_dropped_${ai.qualityScore}`;
  return { ...base, status: "invalidated", reason };
}

export type ScreenerAutoReviewSummary = {
  ok: true;
  reviewed: number;
  invalidated: number;
  results: ScreenerReviewResult[];
};

/** Re-runs the AI suggestion for every screener auto-fired proposal that MT5 hasn't
 * executed yet, and cancels it if the setup no longer holds (direction flipped or
 * score dropped below the auto-fire threshold). Shared by the 30-min cron
 * (/api/screener/auto-review) and the manual "Run now" trigger in /admin/crons. */
export async function runScreenerAutoReview(): Promise<ScreenerAutoReviewSummary> {
  const proposals = await prisma.aiTradeProposal.findMany({
    where: {
      timeframe: SCREENER_AUTO_TIMEFRAME,
      status: "CONFIRMED",
      executedAt: null,
    },
    select: { id: true, symbol: true, direction: true, signalId: true },
  });

  if (proposals.length === 0) {
    return { ok: true, reviewed: 0, invalidated: 0, results: [] };
  }

  const quotesResponse = await resolveQuotes();
  const quoteRows: QuoteRow[] = quotesResponse.quotes.map((q) => ({
    symbol: q.symbol,
    name: q.name,
    group: q.group,
    bid: q.bid,
    ask: q.ask,
    changePct: q.changePct,
  }));

  const results = await Promise.all(proposals.map((p) => reviewProposal(p, quoteRows)));
  const invalidated = results.filter((r) => r.status === "invalidated").length;

  return { ok: true, reviewed: results.length, invalidated, results };
}
