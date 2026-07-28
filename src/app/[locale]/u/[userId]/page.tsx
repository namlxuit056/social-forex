import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Activity, Award, GraduationCap, History, RadioTower, Signal, TrendingUp, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { ProfileAcademySection } from "@/components/profile/profile-academy-section";
import { ProfileFollowersSection } from "@/components/profile/profile-followers-section";
import { PublicProfileHero } from "@/components/profile/public-profile-hero";
import { auth } from "@/auth";
import { TraderPerformanceCard } from "@/components/profile/trader-performance-card";
import { PinnedSignalsSection } from "@/components/profile/pinned-signals-section";
import { Mt5SyncedSignalsSection } from "@/components/profile/mt5-synced-signals-section";
import { PublicTradingOverview } from "@/components/profile/public-trading-overview";
import { PublicLivePositions } from "@/components/profile/public-live-positions";
import { ProfileTradingSummary } from "@/components/profile/profile-trading-summary";
import { ProviderEquitySection } from "@/components/profile/provider-equity-section";
import { TrackRecordSection } from "@/components/profile/track-record-section";
import { StreakBadge } from "@/components/signals/streak-badge";
import { FollowButton } from "@/components/social/follow-button";
import { CopyTradeButton } from "@/components/copy-trade/copy-trade-button";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getLevel, getXpProgress } from "@/lib/xp";
import {
  getPublicDisplayLabel,
  getSignalsAuthorQuery,
} from "@/lib/profile/display";
import { pageCtaItems } from "@/lib/page-cta-i18n";
import { buildSignalsListHref } from "@/lib/signals/signal-list-query";
import { cn } from "@/lib/utils";

type ProfileTab = "overview" | "signals" | "track" | "mt5" | "academy" | "followers";
type Props = {
  params: Promise<{ locale: string; userId: string }>;
  searchParams?: Promise<{ tab?: string }>;
};

const PROFILE_TABS: ProfileTab[] = ["overview", "signals", "track", "mt5", "academy", "followers"];

function daysSince(date: Date): number {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

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
      xp: true,
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
    signalStats,
    existingCopyTrade,
    copierCount,
    lastCopyRow,
    academyCompletedCount,
    closedWins,
    closedTotal,
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
      prisma.signal.aggregate({
        where: { authorId: userId },
        _count: { id: true },
      }),
      session?.user?.id && session.user.id !== userId
        ? prisma.copyTrade.findUnique({
            where: {
              followerId_providerId: {
                followerId: session.user.id,
                providerId: userId,
              },
            },
            select: {
              token: true,
              isActive: true,
              mode: true,
              fixedLot: true,
              riskPercent: true,
              xauusdLot: true,
              btcusdLot: true,
            },
          })
        : null,
      prisma.copyTrade.count({
        where: { providerId: userId, isActive: true },
      }),
      prisma.copyTrade.findFirst({
        where: { providerId: userId, isActive: true },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.academyProgress.count({
        where: { userId, completed: true },
      }),
      prisma.signal.count({
        where: { authorId: userId, status: "CLOSED_WIN" },
      }),
      prisma.signal.count({
        where: { authorId: userId, status: { in: ["CLOSED_WIN", "CLOSED_LOSS"] } },
      }),
    ]);

  const isSelf = session?.user?.id === userId;

  const providerWinRate =
    closedTotal > 0 ? Math.round((closedWins / closedTotal) * 1000) / 10 : null;

  const lastCopyDaysAgo = lastCopyRow ? daysSince(lastCopyRow.createdAt) : null;

  const followerItems = followerRows.map((row) => ({
    id: row.id,
    userId: row.follower.id,
    label: row.follower.name ?? row.follower.email ?? "—",
    image: row.follower.image,
  }));

  const heroBadges = [
    t("profileBadgePublicTrader"),
    ...(hasMt5Sync ? [t("mt5ReadOnlyBadge")] : []),
    ...(copierCount > 0 ? [t("profileBadgeCopiers", { count: copierCount })] : []),
  ];
  const tabs = [
    { value: "overview", label: t("profileTabOverview"), icon: TrendingUp, count: undefined },
    { value: "signals", label: t("profileTabSignals"), icon: Signal, count: threadCount },
    { value: "track", label: t("profileTabTrackRecord"), icon: History, count: closedTotal },
    { value: "mt5", label: t("profileTabMt5"), icon: RadioTower, count: undefined },
    { value: "academy", label: t("profileTabAcademy"), icon: GraduationCap, count: academyCompletedCount },
    { value: "followers", label: t("profileTabFollowers"), icon: Users, count: followerCount },
  ] satisfies Array<{ value: ProfileTab; label: string; icon: typeof Activity; count: number | undefined }>;

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
        socialProof={{
          totalSignals: signalStats._count.id,
          xp: user.xp,
          level: getLevel(user.xp),
          signalsLabel: t("profileTotalSignals"),
          xpLabel: t("profileXpLabel"),
        }}
        actions={
          <>
            {session?.user && !isSelf && (
              <>
                <FollowButton userId={userId} isFollowing={!!isFollowing} />
                <CopyTradeButton
                  providerId={userId}
                  providerName={displayLabel}
                  isSubscribed={!!existingCopyTrade}
                  existingToken={existingCopyTrade?.token}
                  currentMode={existingCopyTrade?.mode}
                  currentFixedLot={existingCopyTrade?.fixedLot}
                  currentRiskPercent={existingCopyTrade?.riskPercent}
                  currentXauusdLot={existingCopyTrade?.xauusdLot}
                  currentBtcusdLot={existingCopyTrade?.btcusdLot}
                  providerWinRate={providerWinRate}
                  providerClosedSignals={closedTotal}
                  providerCopierCount={copierCount}
                  providerLastCopyDaysAgo={lastCopyDaysAgo}
                />
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

      {(user.streakJournal > 0 || user.streakPlan > 0 || user.streakSignal > 0 || user.xp > 0) && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-gradient-to-r from-primary/5 via-card to-primary/5 px-5 py-3.5 ring-1 ring-foreground/5">
          {user.xp > 0 && (
            <div className="flex items-center gap-2.5 rounded-lg bg-primary/10 px-3.5 py-2 ring-1 ring-primary/20">
              <Award className="size-4.5 text-primary" />
              <span className="text-sm font-bold text-primary">Lv.{getLevel(user.xp)}</span>
              <div className="h-2 w-16 rounded-full bg-primary/20">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${getXpProgress(user.xp)}%` }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{user.xp} {t("profileXpLabel")}</span>
            </div>
          )}
          {user.streakJournal > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {t("streakJournal")}: <StreakBadge count={user.streakJournal} type="journal" />
            </span>
          )}
          {user.streakPlan > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {t("streakPlan")}: <StreakBadge count={user.streakPlan} type="plan" />
            </span>
          )}
          {user.streakSignal > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {t("streakSignal")}: <StreakBadge count={user.streakSignal} type="signal" />
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
                {item.count !== undefined && item.count > 0 && (
                  <span className="ml-0.5 inline-flex size-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                    {item.count > 99 ? "99+" : item.count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {activeTab === "overview" ? (
        <div className="space-y-6">
          <PublicLivePositions profileUserId={userId} locale={locale} t={t} />
          <div className="grid gap-6 xl:grid-cols-[0.38fr_0.62fr]">
            <TraderPerformanceCard
              userId={userId}
              signalsListHref={signalsListHref}
              signalsCtaLabel={signalsCtaLabel}
            />
            <PublicTradingOverview profileUserId={userId} locale={locale} t={t} />
          </div>
          <ProviderEquitySection profileUserId={userId} locale={locale} />
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

      {activeTab === "track" ? (
        <TrackRecordSection profileUserId={userId} locale={locale} />
      ) : null}

      {activeTab === "mt5" ? (
        <Mt5SyncedSignalsSection profileUserId={userId} locale={locale} t={t} />
      ) : null}

      {activeTab === "academy" ? (
        <ProfileAcademySection profileUserId={userId} locale={locale} />
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
