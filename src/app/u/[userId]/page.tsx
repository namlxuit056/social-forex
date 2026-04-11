import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { FollowButton } from "@/components/social/follow-button";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ userId: string }> };

export const dynamic = "force-dynamic";

export default async function PublicProfilePage({ params }: Props) {
  const { userId } = await params;
  const session = await auth();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      bio: true,
      createdAt: true,
    },
  });
  if (!user) notFound();

  const [followerCount, followingCount, threadCount, isFollowing] =
    await Promise.all([
      prisma.userFollow.count({ where: { followingId: userId } }),
      prisma.userFollow.count({ where: { followerId: userId } }),
      prisma.forumThread.count({ where: { authorId: userId } }),
      session?.user?.id
        ? prisma.userFollow.findUnique({
            where: {
              followerId_followingId: {
                followerId: session.user.id,
                followingId: userId,
              },
            },
          })
        : null,
    ]);

  const isSelf = session?.user?.id === userId;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            {user.name ?? user.email ?? "Trader"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Tham gia {new Date(user.createdAt).toLocaleDateString("vi-VN")}
          </p>
          {user.bio && <p className="mt-3 text-zinc-400">{user.bio}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {session?.user && !isSelf && (
            <>
              <FollowButton userId={userId} isFollowing={!!isFollowing} />
              <Link
                href={`/messages/${userId}`}
                className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
              >
                Nhắn tin
              </Link>
            </>
          )}
          {!session?.user && (
            <Link
              href="/auth/signin"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white"
            >
              Đăng nhập để follow
            </Link>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-center text-sm">
        <div>
          <dt className="text-zinc-500">Follower</dt>
          <dd className="text-lg font-medium text-white">{followerCount}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Đang follow</dt>
          <dd className="text-lg font-medium text-white">{followingCount}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Thread</dt>
          <dd className="text-lg font-medium text-white">{threadCount}</dd>
        </div>
      </dl>
    </div>
  );
}
