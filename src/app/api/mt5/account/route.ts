import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { LivePosition, Mt5AccountInfo } from "@/app/[locale]/journal/journal-live-panel";

export type Mt5AccountResponse = {
  account: Mt5AccountInfo;
  positions: LivePosition[];
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const connection = await prisma.mt5Connection.findFirst({
    where: { userId: session.user.id, revokedAt: null },
    orderBy: { lastSeenAt: "desc" },
    select: {
      balance: true,
      equity: true,
      margin: true,
      freeMargin: true,
      accountCurrency: true,
      openPositions: true,
      lastSeenAt: true,
      lastPositions: true,
    },
  });

  if (!connection) {
    return NextResponse.json({ error: "no_connection" }, { status: 404 });
  }

  const positions: LivePosition[] = [];
  if (Array.isArray(connection.lastPositions)) {
    for (const p of connection.lastPositions as Record<string, unknown>[]) {
      const ticket = p.ticket != null ? String(p.ticket) : null;
      const symbol = typeof p.symbol === "string" ? p.symbol : null;
      const type = typeof p.type === "string" ? p.type : null;
      if (!ticket || !symbol || !type) continue;
      const num = (v: unknown) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };
      positions.push({
        ticket,
        symbol,
        type,
        volume: num(p.volume),
        priceOpen: num(p.priceOpen),
        priceCurrent: num(p.priceCurrent),
        stopLoss: num(p.stopLoss),
        takeProfit: num(p.takeProfit),
        profit: num(p.profit),
      });
    }
  }

  const body: Mt5AccountResponse = {
    account: {
      balance: connection.balance,
      equity: connection.equity,
      margin: connection.margin,
      freeMargin: connection.freeMargin,
      currency: connection.accountCurrency,
      openPositions: connection.openPositions,
      lastSeenAt: connection.lastSeenAt?.toISOString() ?? null,
    },
    positions,
  };

  return NextResponse.json(body);
}
