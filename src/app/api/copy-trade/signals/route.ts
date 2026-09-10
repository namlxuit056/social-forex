import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { copyActiveOpenSince, isCopySignalEligible } from "@/lib/copy-trade/copy-eligibility";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const querySchema = z.object({
  token: z.string().min(1),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  const parsed = querySchema.safeParse({ token });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const copyTrade = await prisma.copyTrade.findUnique({
    where: { token: parsed.data.token },
    select: {
      id: true,
      isActive: true,
      blockedByProvider: true,
      mode: true,
      fixedLot: true,
      riskPercent: true,
      lotPercent: true,
      maxLots: true,
      xauusdLot: true,
      btcusdLot: true,
      providerId: true,
      createdAt: true,
      follower: { select: { id: true } },
      provider: { select: { id: true } },
    },
  });

  if (!copyTrade || !copyTrade.isActive) {
    return NextResponse.json({ error: "Invalid or inactive subscription" }, { status: 404 });
  }

  // Provider blocked this specific follower — keep the subscription (token, sizing
  // config) intact so unblocking resumes copying without a resubscribe, just serve
  // no signals in the meantime.
  if (copyTrade.blockedByProvider) {
    return NextResponse.json({
      subscriptionId: copyTrade.id,
      mode: copyTrade.mode,
      fixedLot: copyTrade.fixedLot,
      riskPercent: copyTrade.riskPercent,
      lotPercent: copyTrade.lotPercent,
      maxLots: copyTrade.maxLots,
      xauusdLot: copyTrade.xauusdLot,
      btcusdLot: copyTrade.btcusdLot,
      signals: [],
    });
  }

  // Prevent infinite loop when bridge and copy trade run on the same account
  if (copyTrade.follower.id === copyTrade.providerId) {
    return NextResponse.json({
      subscriptionId: copyTrade.id,
      mode: copyTrade.mode,
      fixedLot: copyTrade.fixedLot,
      riskPercent: copyTrade.riskPercent,
      lotPercent: copyTrade.lotPercent,
      maxLots: copyTrade.maxLots,
      xauusdLot: copyTrade.xauusdLot,
      btcusdLot: copyTrade.btcusdLot,
      signals: [],
    });
  }

  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // ACTIVE/PENDING signals are only offered from the point the follower actually
  // subscribed onward — and, for ACTIVE (market-filled) signals, only within a
  // short grace window of the provider opening the trade. Without the window a
  // signal that's been open for hours (provider just hasn't clicked "close" yet)
  // gets served forever to every poll: a follower whose EA loses its dedupe state
  // (terminal/VPS restart, re-subscribe, copy toggled off then on) then treats it
  // as brand new and fires a market order at a price that has long since moved away
  // from the signal's entry. PENDING signals stay eligible for the whole
  // subscription — the EA mirrors them at the provider's exact entry price, so
  // there's no wrong-price risk regardless of age. See @/lib/copy-trade/copy-eligibility.
  const signals = await prisma.signal.findMany({
    where: {
      authorId: copyTrade.providerId,
      excludedFromCopy: false,
      OR: [
        { status: "ACTIVE", createdAt: { gte: copyActiveOpenSince(copyTrade.createdAt, now) } },
        { status: "PENDING", createdAt: { gte: copyTrade.createdAt } },
        {
          status: { in: ["CLOSED_WIN", "CLOSED_LOSS", "CANCELLED"] },
          closedAt: { gte: since24h },
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      symbol: true,
      direction: true,
      orderType: true,
      entry: true,
      stopLoss: true,
      takeProfit: true,
      lotSize: true,
      status: true,
      createdAt: true,
      closedAt: true,
    },
  });

  // Signals born from an AI trade proposal (screener/chart-analysis/scalping confirm) start
  // with no confirmed MT5 order type — the EA decides market-vs-pending against live price
  // only once it actually executes, and the bridge only reports that back on its next
  // heartbeat. Until then `orderType` is null, so hold these back from followers instead of
  // defaulting to a market copy of what may turn out to be a pending order. Plain
  // manually-authored signals (no AI proposal) are unaffected and always eligible.
  const unresolvedCandidateIds = signals.filter((s) => s.orderType == null).map((s) => s.id);
  let unresolvedIds = new Set<string>();
  if (unresolvedCandidateIds.length > 0) {
    const unresolvedProposals = await prisma.aiTradeProposal.findMany({
      where: { signalId: { in: unresolvedCandidateIds }, status: { in: ["CONFIRMED", "EXECUTED"] } },
      select: { signalId: true },
    });
    unresolvedIds = new Set(unresolvedProposals.map((p) => p.signalId as string));
  }
  const eligibleSignals = signals.filter(
    (s) => !unresolvedIds.has(s.id) && isCopySignalEligible(s, copyTrade.createdAt, now),
  );

  return NextResponse.json({
    subscriptionId: copyTrade.id,
    mode: copyTrade.mode,
    fixedLot: copyTrade.fixedLot,
    riskPercent: copyTrade.riskPercent,
    lotPercent: copyTrade.lotPercent,
    maxLots: copyTrade.maxLots,
    xauusdLot: copyTrade.xauusdLot,
    btcusdLot: copyTrade.btcusdLot,
    signals: eligibleSignals,
  });
}
