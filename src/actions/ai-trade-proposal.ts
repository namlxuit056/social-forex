"use server";

import { revalidateLocalizedPath } from "@/lib/revalidate-locales";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { isVipActive } from "@/lib/vip";
import { analyzeTvChart } from "@/lib/ai/tv-chart-analyze";
import { AiUnavailableError } from "@/lib/ai/suggest";
import { QUOTE_BY_SYMBOL } from "@/lib/quotes/definitions";
import { Prisma } from "@/generated/prisma/client";
import { notifyTelegramNewSignal } from "@/lib/telegram";
import { notifySignalSubscribers } from "@/lib/signals/notify-on-signal-create";

export async function requestAiAnalysis(
  symbol: string,
  locale: "vi" | "en" = "vi",
): Promise<{ ok: boolean; proposalId?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "unauthorized" };

  const userId = session.user.id;

  const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { vipUntil: true } });
  if (!isVipActive(dbUser?.vipUntil)) return { ok: false, error: "vip_required" };

  const { ok } = rateLimit(`ai-analysis:${userId}`, 3, 60_000);
  if (!ok) return { ok: false, error: "rate_limited" };

  const def = QUOTE_BY_SYMBOL[symbol.toUpperCase()];
  if (!def) return { ok: false, error: "unknown_symbol" };

  const connection = await prisma.mt5Connection.findFirst({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!connection) return { ok: false, error: "no_connection" };

  let result;
  try {
    result = await analyzeTvChart(symbol.toUpperCase(), def.mockMid, locale);
  } catch (err) {
    if (err instanceof AiUnavailableError) return { ok: false, error: "ai_unavailable" };
    return { ok: false, error: "analysis_failed" };
  }

  const { suggestion } = result;

  const proposal = await prisma.aiTradeProposal.create({
    data: {
      connectionId: connection.id,
      userId,
      symbol: symbol.toUpperCase(),
      timeframe: "TV_MULTI",
      direction: suggestion.direction,
      entry: suggestion.entry,
      stopLoss: suggestion.stopLoss ?? null,
      takeProfit: suggestion.takeProfit ?? null,
      confidence: suggestion.confidence ?? null,
      qualityScore: suggestion.qualityScore ?? null,
      reasoning: suggestion.reasoning,
      checklist: suggestion.tradeChecklist
        ? (JSON.parse(JSON.stringify(suggestion.tradeChecklist)) as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      keyLevels: suggestion.keyLevels
        ? (JSON.parse(JSON.stringify(suggestion.keyLevels)) as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      status: "PENDING_REVIEW",
    },
    select: { id: true },
  });

  revalidateLocalizedPath("/mt5");
  return { ok: true, proposalId: proposal.id };
}

export async function confirmAiTradeProposal(
  proposalId: string,
  lotSize?: number,
): Promise<{ ok: boolean; signalId?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "unauthorized" };
  }
  const userId = session.user.id;

  const proposal = await prisma.aiTradeProposal.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      userId: true,
      status: true,
      symbol: true,
      timeframe: true,
      direction: true,
      entry: true,
      stopLoss: true,
      takeProfit: true,
      confidence: true,
      reasoning: true,
    },
  });

  if (!proposal || proposal.userId !== userId || proposal.status !== "PENDING_REVIEW") {
    return { ok: false, error: "not_found" };
  }

  const validLot = lotSize && lotSize > 0 ? Math.round(lotSize * 100) / 100 : null;
  const notes = `AI Trade Proposal · ${proposal.timeframe} · confidence: ${proposal.confidence ?? "?"}/5\n\n${proposal.reasoning}`;

  const signal = await prisma.signal.create({
    data: {
      authorId: userId,
      symbol: proposal.symbol.toUpperCase(),
      direction: proposal.direction as "LONG" | "SHORT",
      entry: proposal.entry,
      stopLoss: proposal.stopLoss ?? undefined,
      takeProfit: proposal.takeProfit ?? undefined,
      tier: "FREE",
      // The EA decides market-vs-pending against live price only once it actually
      // executes on MT5; until the bridge reports that back, treat this as not-yet-active.
      status: "PENDING",
      notes,
    },
    select: { id: true },
  });

  await prisma.aiTradeProposal.update({
    where: { id: proposalId },
    data: {
      status: "CONFIRMED",
      confirmedAt: new Date(),
      signalId: signal.id,
      lotSize: validLot,
    },
  });

  // In-app notifications
  try {
    await notifySignalSubscribers({
      id: signal.id,
      symbol: proposal.symbol,
      tier: "FREE",
      authorId: userId,
    });
  } catch {
    // Non-blocking
  }

  // Telegram channel notification
  await notifyTelegramNewSignal({
    id: signal.id,
    symbol: proposal.symbol,
    direction: proposal.direction,
    entry: proposal.entry,
    stopLoss: proposal.stopLoss,
    takeProfit: proposal.takeProfit,
    tier: "FREE",
    status: "PENDING",
    authorId: userId,
  });

  revalidateLocalizedPath("/mt5");
  revalidateLocalizedPath("/signals");

  return { ok: true, signalId: signal.id };
}

export async function rejectAiTradeProposal(
  proposalId: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "unauthorized" };
  }
  const userId = session.user.id;

  const proposal = await prisma.aiTradeProposal.findUnique({
    where: { id: proposalId },
    select: { id: true, userId: true, status: true },
  });

  if (!proposal || proposal.userId !== userId || proposal.status !== "PENDING_REVIEW") {
    return { ok: false, error: "not_found" };
  }

  await prisma.aiTradeProposal.update({
    where: { id: proposalId },
    data: {
      status: "REJECTED",
      rejectedAt: new Date(),
    },
  });

  revalidateLocalizedPath("/mt5");

  return { ok: true };
}
