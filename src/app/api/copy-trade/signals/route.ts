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
      providerId: true,
      follower: { select: { id: true } },
      provider: { select: { id: true } },
    },
  });

  if (!copyTrade || !copyTrade.isActive) {
    return NextResponse.json({ error: "Invalid or inactive subscription" }, { status: 404 });
  }

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const signals = await prisma.signal.findMany({
    where: {
      authorId: copyTrade.providerId,
      OR: [
        { status: "ACTIVE" },
        {
          status: { in: ["CLOSED_WIN", "CLOSED_LOSS"] },
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
      entry: true,
      stopLoss: true,
      takeProfit: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    subscriptionId: copyTrade.id,
    mode: copyTrade.mode,
    fixedLot: copyTrade.fixedLot,
    riskPercent: copyTrade.riskPercent,
    maxLots: copyTrade.maxLots,
    signals,
  });
}
