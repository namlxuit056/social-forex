import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type FeedItem = {
  id: string;
  type: "signal_new" | "signal_win" | "signal_loss" | "journal" | "forum";
  createdAt: string;
  author: { id: string; name: string | null; email: string | null; image: string | null };
  data: Record<string, unknown>;
};

export async function GET(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const filter = url.searchParams.get("filter") ?? "all";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 50);
  const before = url.searchParams.get("before");

  const following = await prisma.userFollow.findMany({
    where: { followerId: session.user.id },
    select: { followingId: true },
  });
  const followedIds = following.map((f) => f.followingId);

  if (followedIds.length === 0) {
    return NextResponse.json({ items: [], hasMore: false });
  }

  const items: FeedItem[] = [];

  const shouldFetch = (type: string) => filter === "all" || filter === type;

  if (shouldFetch("signals")) {
    const signals = await prisma.signal.findMany({
      where: {
        authorId: { in: followedIds },
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        symbol: true,
        direction: true,
        entry: true,
        stopLoss: true,
        takeProfit: true,
        tier: true,
        status: true,
        createdAt: true,
        author: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    for (const s of signals) {
      let type: FeedItem["type"] = "signal_new";
      if (s.status === "CLOSED_WIN") type = "signal_win";
      else if (s.status === "CLOSED_LOSS") type = "signal_loss";

      items.push({
        id: `signal-${s.id}`,
        type,
        createdAt: s.createdAt.toISOString(),
        author: s.author,
        data: {
          signalId: s.id,
          symbol: s.symbol,
          direction: s.direction,
          entry: s.entry,
          stopLoss: s.stopLoss,
          takeProfit: s.takeProfit,
          tier: s.tier,
          status: s.status,
        },
      });
    }
  }

  if (shouldFetch("journal")) {
    const journals = await prisma.tradeJournal.findMany({
      where: {
        userId: { in: followedIds },
        result: { not: "PENDING" },
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        symbol: true,
        direction: true,
        result: true,
        pnl: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    for (const j of journals) {
      items.push({
        id: `journal-${j.id}`,
        type: "journal",
        createdAt: j.createdAt.toISOString(),
        author: j.user,
        data: {
          symbol: j.symbol,
          direction: j.direction,
          result: j.result,
          pnl: j.pnl,
        },
      });
    }
  }

  if (shouldFetch("forum")) {
    const threads = await prisma.forumThread.findMany({
      where: {
        authorId: { in: followedIds },
        hidden: false,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        createdAt: true,
        author: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    for (const t of threads) {
      items.push({
        id: `forum-${t.id}`,
        type: "forum",
        createdAt: t.createdAt.toISOString(),
        author: t.author,
        data: { threadId: t.id, title: t.title },
      });
    }
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const sliced = items.slice(0, limit);

  return NextResponse.json({
    items: sliced,
    hasMore: items.length > limit,
  });
}
