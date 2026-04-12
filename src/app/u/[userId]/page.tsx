import Link from "next/link";
import { notFound } from "next/navigation";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { auth } from "@/auth";
import { FollowButton } from "@/components/social/follow-button";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { pageCtas } from "@/lib/page-cta-presets";
import { cn } from "@/lib/utils";

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
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            {user.name ?? user.email ?? "Trader"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tham gia {new Date(user.createdAt).toLocaleDateString("vi-VN")}
          </p>
          {user.bio && <p className="mt-3 text-muted-foreground">{user.bio}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {session?.user && !isSelf && (
            <>
              <FollowButton userId={userId} isFollowing={!!isFollowing} />
              <Link
                href={`/messages/${userId}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Nhắn tin
              </Link>
            </>
          )}
          {!session?.user && (
            <Link
              href="/auth/signin"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Đăng nhập để follow
            </Link>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-4 rounded-xl border border-border bg-card/50 p-4 text-center text-sm ring-1 ring-foreground/5">
        <div>
          <dt className="text-muted-foreground">Follower</dt>
          <dd className="text-lg font-medium text-foreground">{followerCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Đang follow</dt>
          <dd className="text-lg font-medium text-foreground">{followingCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Thread</dt>
          <dd className="text-lg font-medium text-foreground">{threadCount}</dd>
        </div>
      </dl>

      <PageCtaRow heading="Tiếp theo" items={[...pageCtas.community, ...pageCtas.explore]} />
    </div>
  );
}
