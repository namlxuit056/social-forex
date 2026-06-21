import { NextRequest, NextResponse } from "next/server";
import { hashMt5BridgeToken, MT5_BRIDGE_TOKEN_PREFIX } from "@/lib/mt5-bridge";
import { prisma } from "@/lib/prisma";

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.toLowerCase().startsWith("bearer ")) return null;
  return authorization.slice("bearer ".length).trim();
}

export async function GET(request: NextRequest) {
  const token = bearerToken(request);
  if (!token || !token.startsWith(MT5_BRIDGE_TOKEN_PREFIX)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const tokenHash = hashMt5BridgeToken(token);
  const connection = await prisma.mt5Connection.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, revokedAt: true },
  });

  if (!connection || connection.revokedAt) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const proposals = await prisma.aiTradeProposal.findMany({
    where: {
      connectionId: connection.id,
      status: "CONFIRMED",
    },
    orderBy: { createdAt: "asc" },
    take: 10,
    select: {
      id: true,
      signalId: true,
      symbol: true,
      direction: true,
      entry: true,
      stopLoss: true,
      takeProfit: true,
      confidence: true,
    },
  });

  return NextResponse.json({
    signals: proposals.map((p) => ({
      proposalId: p.id,
      signalId: p.signalId,
      symbol: p.symbol,
      direction: p.direction,
      entry: p.entry,
      stopLoss: p.stopLoss,
      takeProfit: p.takeProfit,
      confidence: p.confidence,
    })),
  });
}
