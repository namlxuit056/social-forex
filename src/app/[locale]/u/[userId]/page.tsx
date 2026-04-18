import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { ProfileFollowersSection } from "@/components/profile/profile-followers-section";
import { PublicProfileHero } from "@/components/profile/public-profile-hero";
import { auth } from "@/auth";
import { TraderPerformanceCard } from "@/components/profile/trader-performance-card";
import { FollowButton } from "@/components/social/follow-button";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import {
  getPublicDisplayLabel,
  getSignalsAuthorQuery,
} from "@/lib/profile/display";
import { pageCtaItems } from "@/lib/page-cta-i18n";
import { buildSignalsListHref } from "@/lib/signals/signal-list-query";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: string; userId: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, userId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("profile");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  if (!user) {
    return { title: t("publicMetaNotFoundTitle") };
  }

  const displayName = getPublicDisplayLabel(user.name, user.email);
  return {
    title: t("publicMetaTitle", { name: displayName }),
    description: t("publicMetaDescription", { name: displayName }),
  };
}

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
      image: true,
      createdAt: true,
    },
  });
  if (!user) notFound();

  const displayLabel = getPublicDisplayLabel(user.name, user.email);
  const authorQuery = getSignalsAuthorQuery(user.name);
  const signalsListHref = authorQuery
    ? buildSignalsListHref({
        pathname: "/signals",
        author: authorQuery,
      })
    : "/signals";
  const signalsCtaLabel = authorQuery
    ? t("traderStats.viewSignalsByAuthor")
    : t("traderStats.viewSignals");

  const [followerCount, followingCount, threadCount, isFollowing, followerRows] =
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
      prisma.userFollow.findMany({
        where: { followingId: userId },
        select: {
          id: true,
          follower: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { id: "desc" },
        take: 48,
      }),
    ]);

  const isSelf = session?.user?.id === userId;

  const followerItems = followerRows.map((row) => ({
    id: row.id,
    userId: row.follower.id,
    label: row.follower.name ?? row.follower.email ?? "—",
    image: row.follower.image,
  }));

  return (
    <div className="space-y-8">
      <PublicProfileHero
        displayLabel={displayLabel}
        imageUrl={user.image}
        subtitle={t("publicSubtitle")}
        joinedLine={t("publicJoined", {
          date: new Date(user.createdAt).toLocaleDateString(dateLocale),
        })}
        bio={user.bio}
        actions={
          <>
            {session?.user && !isSelf && (
              <>
                <FollowButton userId={userId} isFollowing={!!isFollowing} />
                <Link
                  href={`/messages/${userId}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "min-h-11 sm:min-h-9",
                  )}
                >
                  {t("messageUser")}
                </Link>
              </>
            )}
            {!session?.user && (
              <Link
                href="/auth/signin"
                className={cn(buttonVariants({ size: "sm" }), "min-h-11 sm:min-h-9")}
              >
                {t("loginToFollow")}
              </Link>
            )}
          </>
        }
      />

      <TraderPerformanceCard
        userId={userId}
        signalsListHref={signalsListHref}
        signalsCtaLabel={signalsCtaLabel}
      />

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

      {threadCount > 0 ? (
        <p className="text-sm text-muted-foreground">
          <Link
            href="/forum"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("forumBrowseCta")}
          </Link>
        </p>
      ) : null}

      {followerCount > 0 ? (
        <ProfileFollowersSection
          items={followerItems}
          totalCount={followerCount}
        />
      ) : null}

      <PageCtaRow heading={tCommon("ctaDiscovery")} items={ctaRow} />
    </div>
  );
}
