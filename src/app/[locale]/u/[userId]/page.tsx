import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { auth } from "@/auth";
import { TraderPerformanceCard } from "@/components/profile/trader-performance-card";
import { FollowButton } from "@/components/social/follow-button";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { pageCtaItems } from "@/lib/page-cta-i18n";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: string; userId: string }> };

export const dynamic = "force-dynamic";

export default async function PublicProfilePage({ params }: Props) {
  const { locale, userId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("profile");
  const tCommon = await getTranslations("common");
  const ctaRow = await pageCtaItems("community", "explore");
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";

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
            {t("publicJoined", {
              date: new Date(user.createdAt).toLocaleDateString(dateLocale),
            })}
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
                {t("messageUser")}
              </Link>
            </>
          )}
          {!session?.user && (
            <Link
              href="/auth/signin"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              {t("loginToFollow")}
            </Link>
          )}
        </div>
      </div>

      <TraderPerformanceCard userId={userId} />

      <dl className="grid grid-cols-3 gap-4 rounded-xl border border-border bg-card/50 p-4 text-center text-sm ring-1 ring-foreground/5">
        <div>
          <dt className="text-muted-foreground">{t("followers")}</dt>
          <dd className="text-lg font-medium text-foreground">{followerCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("following")}</dt>
          <dd className="text-lg font-medium text-foreground">{followingCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("threads")}</dt>
          <dd className="text-lg font-medium text-foreground">{threadCount}</dd>
        </div>
      </dl>

      <PageCtaRow heading={tCommon("next")} items={ctaRow} />
    </div>
  );
}
