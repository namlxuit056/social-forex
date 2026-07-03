import { NextRequest, NextResponse } from "next/server";
import { hashMt5BridgeToken, MT5_BRIDGE_TOKEN_PREFIX } from "@/lib/mt5-bridge";
import { prisma } from "@/lib/prisma";

function bearerToken(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice("bearer ".length).trim();
}

export async function GET(request: NextRequest) {
  const token = bearerToken(request);
  if (!token?.startsWith(MT5_BRIDGE_TOKEN_PREFIX)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const tokenHash = hashMt5BridgeToken(token);
  const connection = await prisma.mt5Connection.findFirst({
    where: { tokenHash, revokedAt: null },
    select: { id: true },
  });

  if (!connection) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Stale price-sensitive commands must not be dispatched with an outdated target price/SL.
  await prisma.mt5Command.updateMany({
    where: { connectionId: connection.id, status: "PENDING", expiresAt: { lt: now } },
    data: { status: "EXPIRED", errorMsg: "expired before dispatch (stale price)", doneAt: now },
  });

  // Fetch PENDING commands, mark them SENT atomically
  const pending = await prisma.mt5Command.findMany({
    where: { connectionId: connection.id, status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: {
      id: true,
      type: true,
      ticket: true,
      symbol: true,
      volume: true,
      price: true,
      stopLoss: true,
      takeProfit: true,
      trailDistancePips: true,
    },
  });

  if (pending.length > 0) {
    await prisma.mt5Command.updateMany({
      where: { id: { in: pending.map((c) => c.id) } },
      data: { status: "SENT", sentAt: new Date() },
    });
  }

  return NextResponse.json({ commands: pending });
}
