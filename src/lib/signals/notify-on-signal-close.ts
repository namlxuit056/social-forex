import { prisma } from "@/lib/prisma";

export async function notifyFollowersSignalClosed({
  signalId,
  authorId,
  status,
}: {
  signalId: string;
  authorId: string;
  status: "CLOSED_WIN" | "CLOSED_LOSS";
}): Promise<void> {
  const kind = status === "CLOSED_WIN" ? "SIGNAL_WIN" : "SIGNAL_LOSS";
  const dedupeKey = `${signalId}-${kind}`;

  const followers = await prisma.userFollow.findMany({
    where: {
      followingId: authorId,
      follower: { notifySignalFollow: true },
    },
    select: { followerId: true },
  });

  if (followers.length === 0) return;

  await prisma.$transaction(
    followers.map(({ followerId }) =>
      prisma.notification.upsert({
        where: { userId_dedupeKey: { userId: followerId, dedupeKey } },
        create: { userId: followerId, signalId, kind, dedupeKey },
        update: {},
      }),
    ),
  );
}
