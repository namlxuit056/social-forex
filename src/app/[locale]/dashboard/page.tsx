import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpen,
  ClipboardList,
  Cable,
  CheckCircle2,
  ClipboardCheck,
  MessageCircle,
  MessageSquare,
  PlusCircle,
  Radio,
  ShieldCheck,
  Target,
  TrendingUp,
  Trophy,
  Users,
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
import { Disclaimer } from "@/components/layout/disclaimer";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { DailyActivityWidget } from "@/components/dashboard/daily-activity-widget";
import { ReferralWidget } from "@/components/dashboard/referral-widget";
import { FeedSection } from "@/components/dashboard/feed-section";
import { RealtimeSignalBanner } from "@/components/dashboard/realtime-signal-banner";

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
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const tc = await getTranslations("common");

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

  const [user, activeSignals, closedSignals, unreadDm] = await Promise.all([
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
  ]);

  const displayName = user?.name ?? user?.email ?? "Trader";
  const vipActive = isVipActive(user?.vipUntil);

  const wins = closedSignals.filter((s) => s.status === "CLOSED_WIN").length;
  const losses = closedSignals.filter((s) => s.status === "CLOSED_LOSS").length;
  const totalClosed = wins + losses;
  const winRate = totalClosed > 0 ? Math.round((wins / totalClosed) * 1000) / 10 : null;

  const statCards = [
    {
      title: t("activeSignals"),
      value: activeSignals,
      detail: t("viewSignals"),
      href: "/signals" as const,
      icon: Radio,
      tone: "primary",
    },
    {
      title: t("closedOrders"),
      value: totalClosed,
      detail: t("winsLosses", { wins, losses }),
      icon: CheckCircle2,
      tone: "default",
    },
    {
      title: t("winRate"),
      value: winRate !== null ? `${winRate}%` : "—",
      detail: t("basedOnClosed"),
      icon: Target,
      tone: winRate !== null ? "primary" : "muted",
    },
    {
      title: t("unreadMessages"),
      value: unreadDm,
      detail: unreadDm > 0 ? t("openInbox") : t("dashboardInboxClear"),
      href: "/messages" as const,
      icon: MessageCircle,
      tone: unreadDm > 0 ? "alert" : "default",
    },
  ];

  const tradingLinks = [
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
      href: "/plan" as const,
      title: t("actionPlan"),
      desc: t("actionPlanDesc"),
      icon: ClipboardCheck,
      tone: "primary",
    },
    {
      href: "/journal" as const,
      title: t("actionJournal"),
      desc: t("actionJournalDesc"),
      icon: ClipboardList,
      tone: "default",
    },
    {
      href: "/mt5" as const,
      title: t("actionMt5"),
      desc: t("actionMt5Desc"),
      icon: Cable,
      tone: "default",
    },
  ];

  const communityLinks = [
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

  const onboardingSteps = [
    {
      href: "/desk" as const,
      label: t("onboardingStepDesk"),
      icon: BarChart3,
    },
    {
      href: "/leaderboard" as const,
      label: t("onboardingStepFollow"),
      icon: Users,
    },
    {
      href: "/journal" as const,
      label: t("onboardingStepJournal"),
      icon: ClipboardList,
    },
  ];

  const marketSnapshots = [
    { symbol: "XAUUSD", label: t("marketGold"), tone: "text-chart-4" },
    { symbol: "EURUSD", label: t("marketMajor"), tone: "text-chart-3" },
    { symbol: "GBPUSD", label: t("marketMajor"), tone: "text-chart-3" },
    { symbol: "BTCUSD", label: t("marketCrypto"), tone: "text-chart-5" },
  ];

  return (
    <div className="space-y-9">
      <div className="grid gap-6 border-b border-border pb-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="text-sm text-muted-foreground">{t("title")}</p>
          <h1 className="mt-1 font-heading text-xl font-semibold tracking-tight text-foreground">
            {t("greeting", { name: displayName })}
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {vipActive ? (
            <Badge className="bg-primary/20 text-primary hover:bg-primary/25">
              <ShieldCheck className="mr-1 size-3.5" aria-hidden />
              {t("vipActive")}
            </Badge>
          ) : (
            <>
              <Badge variant="outline" className="border-border text-muted-foreground">
                {t("freeAccount")}
              </Badge>
              <Link
                href="/upgrade-vip"
                className={cn(buttonVariants({ variant: "default", size: "sm" }))}
              >
                {t("upgradeVip")}
              </Link>
            </>
          )}
          <Link
            href="/profile"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            {tc("profile")}
          </Link>
        </div>
      </div>

      <RealtimeSignalBanner />

      <DailyActivityWidget />

      <ReferralWidget />

      <section aria-labelledby="dashboard-action-heading" className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="dashboard-action-heading" className="font-heading text-lg font-medium text-foreground">
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

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)]">
          <div className="space-y-4">
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                <Activity className="size-3.5" aria-hidden />
                {t("workflowTrading")}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {tradingLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <Card
                      className={cn(
                        "h-full rounded-lg border-border/60 bg-card/70 transition hover:bg-card hover:ring-1 hover:ring-primary/30",
                        item.tone === "primary" && "border-primary/25 bg-primary/8",
                      )}
                    >
                      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                        <div
                          className={cn(
                            "rounded-md bg-muted p-2 ring-1 ring-border",
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
                          <CardTitle className="text-sm">{item.title}</CardTitle>
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
            </div>

            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                <Users className="size-3.5" aria-hidden />
                {t("workflowCommunity")}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {communityLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <Card
                      className={cn(
                        "h-full rounded-lg border-border/60 bg-card/55 transition hover:bg-card hover:ring-1 hover:ring-primary/30",
                        item.tone === "primary" && "border-primary/25 bg-primary/8",
                      )}
                    >
                      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                        <div
                          className={cn(
                            "rounded-md bg-muted p-2 ring-1 ring-border",
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
                          <CardTitle className="text-sm">{item.title}</CardTitle>
                          <CardDescription className="mt-1 text-xs leading-relaxed">
                            {item.desc}
                          </CardDescription>
                        </div>
                      </CardHeader>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <aside className="rounded-lg border border-border/70 bg-muted/15 p-4 ring-1 ring-foreground/5">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-primary/15 p-2 text-primary ring-1 ring-primary/20">
                <Cable className="size-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <h3 className="font-heading text-base font-medium text-foreground">
                  {t("brokerPanelTitle")}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {t("brokerPanelDesc")}
                </p>
              </div>
            </div>
            <Link
              href="/mt5"
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                "mt-4 w-full justify-center",
              )}
            >
              {t("actionMt5")}
            </Link>
          </aside>
        </div>
      </section>

      <section aria-labelledby="dashboard-stats-heading" className="space-y-3">
        <div>
          <h2 id="dashboard-stats-heading" className="font-heading text-lg font-medium text-foreground">
            {t("overviewTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("signalStatsHint")}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card
              key={stat.title}
              className={cn(
                "rounded-lg border-border/60 bg-card/65",
                stat.tone === "primary" && "border-primary/25 bg-primary/8",
                stat.tone === "alert" && "border-chart-2/35 bg-chart-2/8",
              )}
            >
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                <div>
                  <CardDescription>{stat.title}</CardDescription>
                  <CardTitle
                    className={cn(
                      "mt-1 font-mono text-2xl tabular-nums text-foreground",
                      stat.tone === "primary" && "text-chart-1",
                      stat.tone === "alert" && "text-chart-2",
                      stat.tone === "muted" && "text-muted-foreground",
                    )}
                  >
                    {stat.value}
                  </CardTitle>
                </div>
                <div className="rounded-md bg-muted p-2 text-muted-foreground ring-1 ring-border">
                  <stat.icon className="size-4" aria-hidden />
                </div>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {stat.href ? (
                  <Link href={stat.href} className="text-primary hover:underline">
                    {stat.detail}
                  </Link>
                ) : (
                  stat.detail
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {activeSignals === 0 && totalClosed === 0 ? (
        <section
          className="rounded-lg border border-dashed border-border/80 bg-muted/15 px-4 py-5 sm:px-6"
          aria-labelledby="dashboard-empty-signals-heading"
        >
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.55fr)] lg:items-center">
            <div>
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
            </div>
            <div className="grid gap-2">
              {onboardingSteps.map((step, index) => (
                <Link
                  key={step.href}
                  href={step.href}
                  className="group flex items-center gap-3 rounded-md border border-border/60 bg-background/60 px-3 py-2 text-sm transition hover:border-primary/35 hover:bg-background"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground ring-1 ring-border">
                    {index + 1}
                  </span>
                  <step.icon className="size-4 shrink-0 text-primary" aria-hidden />
                  <span className="min-w-0 flex-1 text-foreground">{step.label}</span>
                  <ArrowRight
                    className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary"
                    aria-hidden
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="dashboard-market-heading" className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="dashboard-market-heading" className="font-heading text-lg font-medium text-foreground">
              {t("marketSnapshotTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("marketSnapshotHint")}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/desk"
              className={cn(buttonVariants({ variant: "default", size: "sm" }))}
            >
              {t("openDesk")}
            </Link>
            <Link
              href="/chart"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {t("chartTitle")}
            </Link>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {marketSnapshots.map((item) => (
            <Link
              key={item.symbol}
              href={`/chart?symbol=${item.symbol}`}
              className="group rounded-lg border border-border/70 bg-card/55 px-4 py-3 transition hover:border-primary/35 hover:bg-card focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className={cn("font-mono text-base font-semibold", item.tone)}>
                    {item.symbol}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.label}
                  </p>
                </div>
                <TrendingUp
                  className="size-4 text-muted-foreground transition group-hover:text-primary"
                  aria-hidden
                />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <FeedSection />

      <Separator />
      <Disclaimer variant="compact" />
    </div>
  );
}
