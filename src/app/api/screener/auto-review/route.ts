import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveQuotes } from "@/lib/quotes/resolve-quotes";
import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";
import { getTradingViewTechnicalContext } from "@/lib/ai/tradingview-context";
import { getAiSuggestion, AiUnavailableError } from "@/lib/ai/suggest";
import type { QuoteRow } from "@/lib/quotes/types";
import { SCREENER_AUTO_TIMEFRAME } from "@/lib/signals/create-screener-signal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const AUTO_FIRE_MIN_SCORE = 70;

function authorized(req: NextRequest) {
  const expected = process.env.CRON_SECRET || process.env.ADMIN_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === expected || req.nextUrl.searchParams.get("secret") === expected;
}

type ReviewResult = {
  proposalId: string;
  symbol: string;
  status: "kept" | "invalidated" | "check_failed";
  reason?: string;
};

async function reviewProposal(
  proposal: { id: string; symbol: string; direction: string; signalId: string | null },
  quoteRows: QuoteRow[],
): Promise<ReviewResult> {
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

  const stillValid = ai.direction === proposal.direction && ai.qualityScore >= AUTO_FIRE_MIN_SCORE;
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

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const proposals = await prisma.aiTradeProposal.findMany({
    where: {
      timeframe: SCREENER_AUTO_TIMEFRAME,
      status: "CONFIRMED",
      executedAt: null,
    },
    select: { id: true, symbol: true, direction: true, signalId: true },
  });

  if (proposals.length === 0) {
    return Response.json({ ok: true, reviewed: 0, invalidated: 0, results: [] });
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

  return Response.json({ ok: true, reviewed: results.length, invalidated, results });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
