import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
      mode: true,
      fixedLot: true,
      riskPercent: true,
      maxLots: true,
      xauusdLot: true,
      btcusdLot: true,
      providerId: true,
      follower: { select: { id: true } },
      provider: { select: { id: true } },
    },
  });

  if (!copyTrade || !copyTrade.isActive) {
    return NextResponse.json({ error: "Invalid or inactive subscription" }, { status: 404 });
  }

  // Prevent infinite loop when bridge and copy trade run on the same account
  if (copyTrade.follower.id === copyTrade.providerId) {
    return NextResponse.json({
      subscriptionId: copyTrade.id,
      mode: copyTrade.mode,
      fixedLot: copyTrade.fixedLot,
      riskPercent: copyTrade.riskPercent,
      maxLots: copyTrade.maxLots,
      xauusdLot: copyTrade.xauusdLot,
      btcusdLot: copyTrade.btcusdLot,
      signals: [],
    });
  }

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const signals = await prisma.signal.findMany({
    where: {
      authorId: copyTrade.providerId,
      OR: [
        { status: "ACTIVE" },
        { status: "PENDING" },
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
      status: true,
      createdAt: true,
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
  const eligibleSignals = signals.filter((s) => !unresolvedIds.has(s.id));

  return NextResponse.json({
    subscriptionId: copyTrade.id,
    mode: copyTrade.mode,
    fixedLot: copyTrade.fixedLot,
    riskPercent: copyTrade.riskPercent,
    maxLots: copyTrade.maxLots,
    xauusdLot: copyTrade.xauusdLot,
    btcusdLot: copyTrade.btcusdLot,
    signals: eligibleSignals,
  });
}
