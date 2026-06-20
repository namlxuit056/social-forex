import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Activity, RadioTower, Signal, TrendingUp, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { ProfileFollowersSection } from "@/components/profile/profile-followers-section";
import { PublicProfileHero } from "@/components/profile/public-profile-hero";
import { auth } from "@/auth";
import { TraderPerformanceCard } from "@/components/profile/trader-performance-card";
import { PinnedSignalsSection } from "@/components/profile/pinned-signals-section";
import { Mt5SyncedSignalsSection } from "@/components/profile/mt5-synced-signals-section";
import { PublicTradingOverview } from "@/components/profile/public-trading-overview";
import { ProfileTradingSummary } from "@/components/profile/profile-trading-summary";
import { StreakBadge } from "@/components/signals/streak-badge";
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

type ProfileTab = "overview" | "signals" | "mt5" | "followers";
type Props = {
  params: Promise<{ locale: string; userId: string }>;
  searchParams?: Promise<{ tab?: string }>;
};

const PROFILE_TABS: ProfileTab[] = ["overview", "signals", "mt5", "followers"];

function normalizeTab(value?: string): ProfileTab {
  return PROFILE_TABS.includes(value as ProfileTab)
    ? (value as ProfileTab)
    : "overview";
}

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

export default async function PublicProfilePage({ params, searchParams }: Props) {
  const { locale, userId } = await params;
  const { tab } = (await searchParams) ?? {};
  const activeTab = normalizeTab(tab);
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
      streakJournal: true,
      streakPlan: true,
      streakSignal: true,
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

  const viewerDbUser = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { vipUntil: true },
      })
    : null;

  const [
    followerCount,
    followingCount,
    threadCount,
    isFollowing,
    followerRows,
    hasMt5Sync,
  ] =
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
      prisma.mt5Connection.findFirst({
        where: { userId, revokedAt: null },
        select: { id: true },
      }),
    ]);

  const isSelf = session?.user?.id === userId;

  const followerItems = followerRows.map((row) => ({
    id: row.id,
    userId: row.follower.id,
    label: row.follower.name ?? row.follower.email ?? "—",
    image: row.follower.image,
  }));

  const heroBadges = [
    t("profileBadgePublicTrader"),
    ...(hasMt5Sync ? [t("mt5ReadOnlyBadge")] : []),
  ];
  const tabs = [
    { value: "overview", label: t("profileTabOverview"), icon: TrendingUp },
    { value: "signals", label: t("profileTabSignals"), icon: Signal },
    { value: "mt5", label: t("profileTabMt5"), icon: RadioTower },
    { value: "followers", label: t("profileTabFollowers"), icon: Users },
  ] satisfies Array<{ value: ProfileTab; label: string; icon: typeof Activity }>;

  return (
    <div className="space-y-6">
      <PublicProfileHero
        displayLabel={displayLabel}
        imageUrl={user.image}
        subtitle={t("publicSubtitle")}
        joinedLine={t("publicJoined", {
          date: new Date(user.createdAt).toLocaleDateString(dateLocale),
        })}
        bio={user.bio}
        followerCount={followerCount}
        followingCount={followingCount}
        threadCount={threadCount}
        followersLabel={t("followers")}
        followingLabel={t("following")}
        threadsLabel={t("threads")}
        badges={heroBadges}
        actions={
          <>
            {session?.user && !isSelf && (
              <>
                <FollowButton userId={userId} isFollowing={!!isFollowing} />
                <Link
                  href={`/messages/${userId}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "min-h-11 w-full justify-center sm:min-h-9 sm:w-auto",
                  )}
                >
                  {t("messageUser")}
                </Link>
              </>
            )}
            {!session?.user && (
              <Link
                href="/auth/signin"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "min-h-11 w-full justify-center sm:min-h-9 sm:w-auto",
                )}
              >
                {t("loginToFollow")}
              </Link>
            )}
          </>
        }
      />

      {(user.streakJournal > 0 || user.streakPlan > 0 || user.streakSignal > 0) && (
        <div className="flex flex-wrap gap-3 rounded-lg border border-border/60 bg-card/40 px-4 py-3">
          {user.streakJournal > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              Nhật ký: <StreakBadge count={user.streakJournal} type="journal" />
            </span>
          )}
          {user.streakPlan > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              Kế hoạch: <StreakBadge count={user.streakPlan} type="plan" />
            </span>
          )}
          {user.streakSignal > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              Signal: <StreakBadge count={user.streakSignal} type="signal" />
            </span>
          )}
        </div>
      )}

      <ProfileTradingSummary profileUserId={userId} t={t} />

      <nav
        aria-label={t("profileTabsLabel")}
        className="sticky top-0 z-20 -mx-4 overflow-x-auto border-y border-border/60 bg-background/90 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:static sm:mx-0 sm:rounded-lg sm:border sm:bg-card/35"
      >
        <div className="flex min-w-max gap-2">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.value;
            return (
              <Link
                key={item.value}
                href={`/u/${userId}?tab=${item.value}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors",
                  active
                    ? "border-primary/35 bg-primary/15 text-primary"
                    : "border-transparent bg-muted/35 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {activeTab === "overview" ? (
        <div className="grid gap-6 xl:grid-cols-[0.38fr_0.62fr]">
          <TraderPerformanceCard
            userId={userId}
            signalsListHref={signalsListHref}
            signalsCtaLabel={signalsCtaLabel}
          />
          <PublicTradingOverview profileUserId={userId} locale={locale} t={t} />
        </div>
      ) : null}

      {activeTab === "signals" ? (
        <div className="space-y-6">
          <PinnedSignalsSection
            profileUserId={userId}
            viewerVipUntil={viewerDbUser?.vipUntil}
            viewerUserId={session?.user?.id}
          />
          <Mt5SyncedSignalsSection profileUserId={userId} locale={locale} t={t} />
        </div>
      ) : null}

      {activeTab === "mt5" ? (
        <Mt5SyncedSignalsSection profileUserId={userId} locale={locale} t={t} />
      ) : null}

      {activeTab === "followers" && followerCount > 0 ? (
        <ProfileFollowersSection items={followerItems} totalCount={followerCount} />
      ) : null}

      {activeTab === "followers" && followerCount === 0 ? (
        <section className="rounded-lg border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
          {t("profileNoFollowers")}
        </section>
      ) : null}

      <PageCtaRow heading={tCommon("ctaDiscovery")} items={ctaRow} />
    </div>
  );
}
