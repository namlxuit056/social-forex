import { prisma } from "@/lib/prisma";
import { resolveQuotes } from "@/lib/quotes/resolve-quotes";
import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";
import type { QuoteRow } from "@/lib/quotes/types";
import { getScalpingTechnicalContext } from "@/lib/ai/scalping-tradingview-context";
import { getAiNewsContext } from "@/lib/ai/news-context";
import { getScalpingAiSuggestion } from "@/lib/ai/scalping-suggest";
import { AiUnavailableError } from "@/lib/ai/suggest";
import { commandExpiresAt } from "@/lib/mt5/command-ttl";

const DEFAULT_MIN_SCORE = 72;
const DEFAULT_MIN_CONFIDENCE = 3;

export type AutoScalpRecheckResult =
  | {
      ok: true;
      verdict: "kept" | "cancelled";
      /** re-run AI numbers */
      newScore: number;
      newConfidence: number;
      newDirection: string;
      oldDirection: string;
      /** thresholds the verdict was judged against */
      minScore: number;
      minConfidence: number;
      reasoning: string;
      /** only on "cancelled" */
      reason?: string;
      mt5CancelQueued?: boolean;
    }
  | { ok: false; error: string };

function fmtNow(): string {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date());
}

async function appendSignalNote(signalId: string, line: string): Promise<void> {
  const signal = await prisma.signal.findUnique({ where: { id: signalId }, select: { notes: true } });
  const notes = [signal?.notes?.trim(), line].filter(Boolean).join("\n\n");
  await prisma.signal.update({ where: { id: signalId }, data: { notes } });
}

/**
 * Re-runs the Auto-Scalp AI analysis for a still-pending ("chưa khớp") order and
 * decides whether the setup still holds. If it no longer does — direction flipped,
 * or score/confidence dropped below the user's Auto-Scalp thresholds — the proposal
 * is rejected, the signal cancelled, and a CANCEL_ORDER command is queued for the
 * owner's MT5 bridge. Mirrors runScreenerAutoReview but for one order, on demand.
 */
export async function recheckAutoScalpPending(proposalId: string): Promise<AutoScalpRecheckResult> {
  const proposal = await prisma.aiTradeProposal.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      userId: true,
      connectionId: true,
      symbol: true,
      direction: true,
      timeframe: true,
      mt5Ticket: true,
      signalId: true,
    },
  });

  if (!proposal || proposal.timeframe !== "M5_AUTO" || !proposal.signalId) {
    return { ok: false, error: "proposal_not_found" };
  }

  const signal = await prisma.signal.findUnique({
    where: { id: proposal.signalId },
    select: { id: true, status: true },
  });
  if (!signal) return { ok: false, error: "signal_not_found" };
  if (signal.status !== "PENDING") return { ok: false, error: "not_pending" };

  const def = QUOTE_DEFINITIONS.find((d) => d.symbol === proposal.symbol);
  if (!def) return { ok: false, error: "symbol_not_found" };

  const quotesResponse = await resolveQuotes();
  const liveQuote = quotesResponse.quotes.find((q) => q.symbol === proposal.symbol);
  const quote: QuoteRow = liveQuote
    ? {
        symbol: liveQuote.symbol,
        name: liveQuote.name,
        group: liveQuote.group,
        bid: liveQuote.bid,
        ask: liveQuote.ask,
        changePct: liveQuote.changePct,
      }
    : { symbol: def.symbol, name: def.name, group: def.group, bid: def.mockMid, ask: def.mockMid, changePct: 0 };

  let ai;
  try {
    const [tvResult, newsResult] = await Promise.allSettled([
      getScalpingTechnicalContext(quote),
      getAiNewsContext(quote.symbol),
    ]);
    ai = await getScalpingAiSuggestion(
      quote,
      tvResult.status === "fulfilled" ? tvResult.value : null,
      newsResult.status === "fulfilled" ? newsResult.value : null,
      "vi",
      { skipCache: true },
    );
  } catch (err) {
    return { ok: false, error: err instanceof AiUnavailableError ? "ai_unavailable" : "ai_error" };
  }

  const config = await prisma.autoScalpConfig.findUnique({
    where: { userId: proposal.userId },
    select: { minScore: true, minConfidence: true },
  });
  const minScore = config?.minScore ?? DEFAULT_MIN_SCORE;
  const minConfidence = config?.minConfidence ?? DEFAULT_MIN_CONFIDENCE;

  const directionHeld = ai.direction === proposal.direction;
  const keep = directionHeld && ai.qualityScore >= minScore && ai.confidence >= minConfidence;

  const common = {
    newScore: ai.qualityScore,
    newConfidence: ai.confidence,
    newDirection: ai.direction,
    oldDirection: proposal.direction,
    minScore,
    minConfidence,
    reasoning: ai.reasoning,
  };

  if (keep) {
    await appendSignalNote(
      signal.id,
      `[Re-check ${fmtNow()}] GIỮ — hướng ${ai.direction} không đổi, score ${ai.qualityScore}/${minScore}, confidence ${ai.confidence}/${minConfidence}.\n${ai.reasoning}`,
    );
    return { ok: true, verdict: "kept", ...common };
  }

  const reason = !directionHeld
    ? `direction_flipped_${ai.direction}`
    : ai.qualityScore < minScore
      ? `score_dropped_${ai.qualityScore}`
      : `confidence_dropped_${ai.confidence}`;

  await prisma.aiTradeProposal.update({
    where: { id: proposal.id },
    data: { status: "REJECTED", rejectedAt: new Date() },
  });
  await prisma.signal.updateMany({
    where: { id: signal.id, status: "PENDING" },
    data: { status: "CANCELLED", closedAt: new Date() },
  });

  let mt5CancelQueued = false;
  if (proposal.mt5Ticket && proposal.connectionId) {
    await prisma.mt5Command.create({
      data: {
        connectionId: proposal.connectionId,
        type: "CANCEL_ORDER",
        ticket: proposal.mt5Ticket,
        expiresAt: commandExpiresAt("CANCEL_ORDER"),
      },
    });
    mt5CancelQueued = true;
  }

  await appendSignalNote(
    signal.id,
    `[Re-check ${fmtNow()}] HUỶ — ${reason}. score ${ai.qualityScore}/${minScore}, confidence ${ai.confidence}/${minConfidence}.\n${ai.reasoning}`,
  );

  return { ok: true, verdict: "cancelled", reason, mt5CancelQueued, ...common };
}
