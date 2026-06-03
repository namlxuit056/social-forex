import { Suspense } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ClipboardList,
  Lock,
  MessageCircle,
  MessageSquare,
  PlusCircle,
  Trophy,
  Wrench,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChartContainer } from "@/components/charts/chart-container";
import { Disclaimer } from "@/components/layout/disclaimer";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";

type FollowFeedMode = "latest" | "active";

function parseFollowFeedMode(value: string | string[] | undefined): FollowFeedMode {
  return value === "active" ? "active" : "latest";
}

function signalStatusText(
  status: "ACTIVE" | "CLOSED_WIN" | "CLOSED_LOSS" | "CANCELLED",
  t: (key: string) => string,
) {
  switch (status) {
    case "ACTIVE":
      return t("followFeedStatusActive");
    case "CLOSED_WIN":
      return t("followFeedStatusWin");
    case "CLOSED_LOSS":
      return t("followFeedStatusLoss");
    case "CANCELLED":
      return t("followFeedStatusCancelled");
    default:
      return status;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ follow?: string | string[] }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const tc = await getTranslations("common");
  const followFeedMode = parseFollowFeedMode(query?.follow);

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect({
      href: {
        pathname: "/auth/signin",
        query: { callbackUrl: "/dashboard" },
      },
      locale,
    });
  }

  const [user, activeSignals, closedSignals, unreadDm, following] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, vipUntil: true },
    }),
    prisma.signal.count({
      where: { authorId: userId, status: "ACTIVE" },
    }),
    prisma.signal.findMany({
      where: { authorId: userId, status: { in: ["CLOSED_WIN", "CLOSED_LOSS"] } },
      select: { status: true },
    }),
    prisma.directMessage.count({
      where: { recipientId: userId, readAt: null },
    }),
    prisma.userFollow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
      orderBy: { id: "asc" },
    }),
  ]);

  const displayName = user?.name ?? user?.email ?? "Trader";
  const vipActive = isVipActive(user?.vipUntil);
  const followedTraderIds = following.map((f) => f.followingId);
  const followedSignals =
    followedTraderIds.length > 0
      ? await prisma.signal.findMany({
          where: {
            authorId: { in: followedTraderIds },
            ...(followFeedMode === "active" ? { status: "ACTIVE" as const } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 6,
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
            author: { select: { id: true, name: true, email: true } },
          },
        })
      : [];

  const wins = closedSignals.filter((s) => s.status === "CLOSED_WIN").length;
  const losses = closedSignals.filter((s) => s.status === "CLOSED_LOSS").length;
  const totalClosed = wins + losses;
  const winRate = totalClosed > 0 ? Math.round((wins / totalClosed) * 1000) / 10 : null;

  const quickLinks = [
    {
      href: "/signals" as const,
      title: t("actionPostSignal"),
      desc: t("actionPostSignalDesc"),
      icon: PlusCircle,
      tone: "primary",
    },
    {
      href: "/desk" as const,
      title: t("actionOpenDesk"),
      desc: t("actionOpenDeskDesc"),
      icon: BarChart3,
      tone: "default",
    },
    {
      href: "/journal" as const,
      title: t("actionJournal"),
      desc: t("actionJournalDesc"),
      icon: ClipboardList,
      tone: "default",
    },
    {
      href: "/challenge" as const,
      title: t("actionChallenge"),
      desc: t("actionChallengeDesc"),
      icon: Trophy,
      tone: "primary",
    },
    {
      href: "/messages" as const,
      title: t("actionMessages"),
      desc: unreadDm > 0 ? t("actionMessagesUnread", { count: unreadDm }) : t("actionMessagesDesc"),
      icon: MessageCircle,
      tone: unreadDm > 0 ? "primary" : "default",
    },
    {
      href: "/leaderboard" as const,
      title: t("actionPerformance"),
      desc: t("actionPerformanceDesc"),
      icon: Trophy,
      tone: "default",
    },
    {
      href: "/academy" as const,
      title: t("actionAcademy"),
      desc: t("actionAcademyDesc"),
      icon: BookOpen,
      tone: "default",
    },
    {
      href: "/forum" as const,
      title: t("actionForum"),
      desc: t("actionForumDesc"),
      icon: MessageSquare,
      tone: "default",
    },
    {
      href: "/tools" as const,
      title: t("actionTools"),
      desc: t("actionToolsDesc"),
      icon: Wrench,
      tone: "default",
    },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 border-b border-border pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {t("title")}
          </p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {t("greeting", { name: displayName })}
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            {t("subtitle")}
          </p>
          <p className="mt-2 max-w-xl text-xs text-muted-foreground/90">
            {t("signalStatsHint")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {vipActive ? (
            <Badge className="bg-primary/20 text-primary hover:bg-primary/25">
              {t("vipActive")}
            </Badge>
          ) : (
            <Badge variant="outline" className="border-border text-muted-foreground">
              {t("freeAccount")}
            </Badge>
          )}
          <Link
            href="/profile"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            {tc("profile")}
          </Link>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("activeSignals")}</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums text-chart-1">
              {activeSignals}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            <Link href="/signals" className="text-primary hover:underline">
              {t("viewSignals")}
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("closedOrders")}</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums text-foreground">
              {totalClosed}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {t("winsLosses", { wins, losses })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("winRate")}</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums text-chart-1">
              {winRate !== null ? `${winRate}%` : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {t("basedOnClosed")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("unreadMessages")}</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums text-foreground">
              {unreadDm}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            <Link href="/messages" className="text-primary hover:underline">
              {t("openInbox")}
            </Link>
          </CardContent>
        </Card>
      </section>

      {activeSignals === 0 && totalClosed === 0 ? (
        <section
          className="rounded-xl border border-dashed border-border/80 bg-muted/15 px-4 py-5 sm:px-6"
          aria-labelledby="dashboard-empty-signals-heading"
        >
          <h2
            id="dashboard-empty-signals-heading"
            className="font-heading text-base font-medium text-foreground"
          >
            {t("emptySignalsTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("emptySignalsBody")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/start"
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "text-xs font-medium",
              )}
            >
              {t("emptySignalsCtaStart")}
            </Link>
            <Link
              href="/quotes"
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                "text-xs font-medium",
              )}
            >
              {t("emptySignalsCtaQuotes")}
            </Link>
            <Link
              href="/calendar"
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                "text-xs font-medium",
              )}
            >
              {t("emptySignalsCtaCalendar")}
            </Link>
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-heading text-lg font-medium text-foreground">
              {t("followFeedTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("followFeedHint")}
            </p>
          </div>
          <div className="flex rounded-lg border border-border bg-muted/20 p-1">
            {(["latest", "active"] as const).map((mode) => (
              <Link
                key={mode}
                href={mode === "latest" ? "/dashboard" : "/dashboard?follow=active"}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition",
                  followFeedMode === mode
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={followFeedMode === mode ? "page" : undefined}
              >
                {mode === "latest"
                  ? t("followFeedFilterLatest")
                  : t("followFeedFilterActive")}
              </Link>
            ))}
          </div>
        </div>

        {followedTraderIds.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/15 px-4 py-5 sm:px-6">
            <h3 className="font-heading text-base font-medium text-foreground">
              {t("followFeedNoFollowsTitle")}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("followFeedNoFollowsBody")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/leaderboard"
                className={cn(buttonVariants({ variant: "default", size: "sm" }))}
              >
                {t("followFeedNoFollowsCtaLeaderboard")}
              </Link>
              <Link
                href="/signals"
                className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
              >
                {t("followFeedNoFollowsCtaSignals")}
              </Link>
            </div>
          </div>
        ) : followedSignals.length === 0 ? (
          <div className="rounded-xl border border-border bg-card/50 px-4 py-5 sm:px-6">
            <h3 className="font-heading text-base font-medium text-foreground">
              {t("followFeedEmptyTitle")}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {followFeedMode === "active"
                ? t("followFeedEmptyActiveBody")
                : t("followFeedEmptyLatestBody")}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {followedSignals.map((signal) => {
              const masked = signal.tier === "VIP" && !vipActive && signal.author.id !== userId;
              const authorLabel =
                signal.author.name ?? signal.author.email ?? t("followFeedTraderFallback");
              const createdAt = signal.createdAt.toLocaleString(locale);
              return (
                <Card
                  key={signal.id}
                  className="border-border/70 bg-card/70 transition hover:bg-card"
                >
                  <CardHeader className="space-y-3 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/signals/${signal.id}`}
                            className="font-heading text-base font-semibold text-foreground hover:text-primary"
                          >
                            {signal.symbol} {signal.direction}
                          </Link>
                          <Badge variant={signal.tier === "VIP" ? "secondary" : "outline"}>
                            {signal.tier}
                          </Badge>
                          <Badge variant="outline">
                            {signalStatusText(signal.status, t)}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("followFeedByline", {
                            trader: authorLabel,
                            date: createdAt,
                          })}
                        </p>
                      </div>
                      <Link
                        href={`/u/${signal.author.id}`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        {t("followFeedViewTrader")}
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {masked ? (
                      <div className="flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-muted-foreground">
                        <Lock className="size-4 shrink-0 text-amber-500" aria-hidden />
                        {t("followFeedVipLocked")}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="rounded-lg bg-muted/30 px-3 py-2">
                          <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                            {t("followFeedEntry")}
                          </p>
                          <p className="font-mono text-foreground">{signal.entry}</p>
                        </div>
                        <div className="rounded-lg bg-muted/30 px-3 py-2">
                          <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                            {t("followFeedStopLoss")}
                          </p>
                          <p className="font-mono text-foreground">
                            {signal.stopLoss ?? "—"}
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted/30 px-3 py-2">
                          <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                            {t("followFeedTakeProfit")}
                          </p>
                          <p className="font-mono text-foreground">
                            {signal.takeProfit ?? "—"}
                          </p>
                        </div>
                      </div>
                    )}
                    <Link
                      href={`/signals/${signal.id}`}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "sm" }),
                        "px-0 text-primary hover:text-primary",
                      )}
                    >
                      {t("followFeedOpenSignal")}
                      <ArrowRight className="ml-1 size-4" aria-hidden />
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-medium text-foreground">
          {t("chartTitle")}
        </h2>
        <Suspense>
          <ChartContainer locale={locale} showAiPanel={false} />
        </Suspense>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-heading text-lg font-medium text-foreground">
              {t("shortcuts")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("shortcutsHint")}
            </p>
          </div>
          <Link
            href="/desk"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            {t("openDesk")}
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <Card
                className={cn(
                  "h-full border-border/60 bg-card/70 transition hover:bg-card hover:ring-1 hover:ring-primary/30",
                  item.tone === "primary" && "border-primary/25 bg-primary/8",
                )}
              >
                <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                  <div
                    className={cn(
                      "rounded-lg bg-muted p-2 ring-1 ring-border",
                      item.tone === "primary" && "bg-primary/15 ring-primary/25",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "size-4 text-primary",
                        item.tone !== "primary" && "text-muted-foreground group-hover:text-primary",
                      )}
                      aria-hidden
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <CardDescription className="mt-1 text-xs leading-relaxed">
                      {item.desc}
                    </CardDescription>
                  </div>
                  <ArrowRight
                    className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary"
                    aria-hidden
                  />
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <Separator />
      <Disclaimer variant="compact" />
    </div>
  );
}
