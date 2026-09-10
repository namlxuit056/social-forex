import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  Users,
  Crown,
  Flag,
  TrendingUp,
  Activity,
  ArrowRight,
  Bot,
  BookOpen,
  Cpu,
  Timer,
  Gauge,
  Send,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return { title: t("dashboard") };
}

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (admin?.role !== "ADMIN" && admin?.role !== "MOD") {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-2xl font-semibold">{t("noAccess")}</h1>
        <p className="text-muted-foreground">{t("noAccessHint")}</p>
      </div>
    );
  }

  const [totalUsers, vipUsers, pendingReports, activeSignals] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.findMany({
        where: { vipUntil: { not: null } },
        select: { vipUntil: true },
      }),
      prisma.forumReport.count({ where: { status: "OPEN" } }),
      prisma.signal.count({ where: { status: "ACTIVE" } }),
    ]);

  const activeVipCount = vipUsers.filter((u) =>
    isVipActive(u.vipUntil),
  ).length;

  const stats = [
    {
      label: t("totalUsers"),
      value: totalUsers,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: t("activeVip"),
      value: activeVipCount,
      icon: Crown,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
    },
    {
      label: t("pendingReports"),
      value: pendingReports,
      icon: Flag,
      color: pendingReports > 0 ? "text-red-500" : "text-muted-foreground",
      bg: pendingReports > 0 ? "bg-red-500/10" : "bg-muted/50",
    },
    {
      label: t("activeSignals"),
      value: activeSignals,
      icon: TrendingUp,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
  ];

  const links = [
    { href: "/admin/vip", label: t("manageVip"), icon: Crown },
    { href: "/admin/users", label: t("manageUsers"), icon: Users },
    { href: "/admin/reports", label: t("manageReports"), icon: Flag },
    { href: "/admin/signals", label: t("manageSignals"), icon: TrendingUp },
    { href: "/admin/analytics", label: t("manageAnalytics"), icon: Activity },
    { href: "/admin/articles", label: t("manageAiArticles"), icon: Bot },
    { href: "/admin/academy", label: "Bài học Academy AI", icon: BookOpen },
    { href: "/admin/ai-settings", label: t("aiModelSettings"), icon: Cpu },
    { href: "/admin/crons", label: t("manageCrons"), icon: Timer },
    { href: "/admin/scalping-calibration", label: t("scalpingCalibration"), icon: Gauge },
    { href: "/admin/telegram-signals", label: t("telegramSignals"), icon: Send },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {t("dashboard")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("dashboardDesc")}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-border/60">
            <CardContent className="flex items-center gap-4 p-5">
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-lg",
                  s.bg,
                )}
              >
                <s.icon className={cn("size-5", s.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums text-foreground">
                  {s.value}
                </p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick links */}
      <Card>
        <CardHeader>
          <CardTitle>{t("quickLinks")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-auto justify-between gap-2 px-4 py-3",
              )}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <l.icon className="size-4 text-muted-foreground" />
                {l.label}
              </span>
              <ArrowRight className="size-3.5 text-muted-foreground" />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
