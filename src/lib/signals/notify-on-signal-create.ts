import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";

/**
 * In-app notifications: followers, watchlist symbol, optional VIP broadcast.
 * Một dòng / user / signal (skipDuplicates).
 */
export async function notifySignalSubscribers(signal: {
  id: string;
  symbol: string;
  tier: "FREE" | "VIP";
  authorId: string;
}): Promise<void> {
  const symbol = signal.symbol.toUpperCase();
  const authorId = signal.authorId;
  const ids = new Set<string>();

  const followers = await prisma.userFollow.findMany({
    where: { followingId: authorId },
    select: {
      followerId: true,
      follower: { select: { notifySignalFollow: true } },
    },
  });
  for (const f of followers) {
    if (f.follower.notifySignalFollow) ids.add(f.followerId);
  }

  const favRows = await prisma.userFavoriteSymbol.findMany({
    where: { symbol },
    select: {
      userId: true,
      user: { select: { notifySignalFavoriteSym: true } },
    },
  });
  for (const row of favRows) {
    if (row.user.notifySignalFavoriteSym) ids.add(row.userId);
  }

  if (signal.tier === "VIP") {
    const vipUsers = await prisma.user.findMany({
      where: {
        notifySignalVipBroadcast: true,
        vipUntil: { gt: new Date() },
      },
      select: { id: true, vipUntil: true },
    });
    for (const u of vipUsers) {
      if (isVipActive(u.vipUntil) && u.id !== authorId) ids.add(u.id);
    }
  }

  ids.delete(authorId);

  if (ids.size === 0) return;

  await prisma.$transaction(
    [...ids].map((userId) =>
      prisma.notification.upsert({
        where: {
          userId_dedupeKey: { userId, dedupeKey: signal.id },
        },
        create: {
          userId,
          signalId: signal.id,
          kind: "SIGNAL_NEW",
          dedupeKey: signal.id,
        },
        update: {},
      }),
    ),
  );
}
