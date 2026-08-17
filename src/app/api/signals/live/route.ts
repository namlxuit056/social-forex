import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type LiveSignal = {
  id: string;
  symbol: string;
  direction: string;
  tier: string;
  author: string;
};

// Polled by the dashboard's realtime signal banner. `sinceMs` is how far
// back to look — the client passes its poll interval (plus a little slack)
// so nothing gets missed between polls without needing a persistent stream.
const MAX_LOOKBACK_MS = 5 * 60_000;

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sinceMs = Math.min(
    Number(searchParams.get("sinceMs")) || 60_000,
    MAX_LOOKBACK_MS,
  );

  const signals = await prisma.signal.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - sinceMs) },
      author: { followerFollows: { some: { followerId: session.user.id } } },
    },
    select: {
      id: true,
      symbol: true,
      direction: true,
      tier: true,
      author: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const result: LiveSignal[] = signals.map((s) => ({
    id: s.id,
    symbol: s.symbol,
    direction: s.direction,
    tier: s.tier,
    author: s.author.name ?? "",
  }));

  return NextResponse.json({ signals: result });
}
