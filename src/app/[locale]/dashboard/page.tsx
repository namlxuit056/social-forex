import {
  ArrowRight,
  BarChart3,
  BookOpen,
  MessageSquare,
  Radio,
  Trophy,
  Wrench,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
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
import { DashboardTradingViewWidget } from "@/components/dashboard/tradingview-widget";
import { Disclaimer } from "@/components/layout/disclaimer";
import { prisma } from "@/lib/prisma";

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
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/dashboard");
  }

  const userId = session.user.id;

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
  const now = new Date();
  const vipActive = user?.vipUntil != null && user.vipUntil > now;

  const wins = closedSignals.filter((s) => s.status === "CLOSED_WIN").length;
  const losses = closedSignals.filter((s) => s.status === "CLOSED_LOSS").length;
  const totalClosed = wins + losses;
  const winRate = totalClosed > 0 ? Math.round((wins / totalClosed) * 1000) / 10 : null;

  const quickLinks = [
    { href: "/quotes" as const, titleKey: "nav.quotes", desc: "—", icon: BarChart3 },
    { href: "/signals" as const, titleKey: "nav.signals", desc: "—", icon: Radio },
    { href: "/forum" as const, titleKey: "nav.forum", desc: "—", icon: MessageSquare },
    { href: "/leaderboard" as const, titleKey: "nav.leaderboard", desc: "—", icon: Trophy },
    { href: "/academy" as const, titleKey: "nav.academy", desc: "—", icon: BookOpen },
    { href: "/tools" as const, titleKey: "nav.tools", desc: "—", icon: Wrench },
  ];

  const tn = await getTranslations("nav");

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

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-medium text-foreground">
          {t("chartTitle")}
        </h2>
        <DashboardTradingViewWidget />
      </section>

      <section>
        <h2 className="mb-4 font-heading text-lg font-medium text-foreground">
          {t("shortcuts")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="h-full transition hover:ring-1 hover:ring-primary/30">
                <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                  <div className="rounded-lg bg-muted p-2 ring-1 ring-border">
                    <item.icon className="size-4 text-primary" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">
                      {tn(item.titleKey.split(".")[1] as "quotes" | "signals" | "forum" | "leaderboard" | "academy" | "tools")}
                    </CardTitle>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
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
