import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getLevel } from "@/lib/xp";

export const runtime = "nodejs";

export type SuggestedTrader = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  xp: number;
  level: number;
  signalCount: number;
  winRate: number | null;
};

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ traders: [] });
  }

  const alreadyFollowing = await prisma.userFollow.findMany({
    where: { followerId: session.user.id },
    select: { followingId: true },
  });
  const excludeIds = new Set([
    session.user.id,
    ...alreadyFollowing.map((f) => f.followingId),
  ]);

  const topUsers = await prisma.user.findMany({
    where: { id: { notIn: [...excludeIds] } },
    orderBy: { xp: "desc" },
    take: 6,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      xp: true,
      _count: { select: { signals: true } },
    },
  });

  const userIds = topUsers.map((u) => u.id);
  const winStats = await prisma.signal.groupBy({
    by: ["authorId"],
    where: {
      authorId: { in: userIds },
      status: { in: ["CLOSED_WIN", "CLOSED_LOSS"] },
    },
    _count: { status: true },
  });

  const winMap = new Map<string, { wins: number; total: number }>();
  for (const s of winStats) {
    winMap.set(s.authorId, { wins: 0, total: s._count.status });
  }
  const winSignals = await prisma.signal.groupBy({
    by: ["authorId"],
    where: { authorId: { in: userIds }, status: "CLOSED_WIN" },
    _count: { status: true },
  });
  for (const s of winSignals) {
    const entry = winMap.get(s.authorId);
    if (entry) entry.wins = s._count.status;
  }

  const traders: SuggestedTrader[] = topUsers.map((u) => {
    const stats = winMap.get(u.id);
    const winRate =
      stats && stats.total > 0
        ? Math.round((stats.wins / stats.total) * 100)
        : null;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      xp: u.xp,
      level: getLevel(u.xp),
      signalCount: u._count.signals,
      winRate,
    };
  });

  return NextResponse.json({ traders });
}
