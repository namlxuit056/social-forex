import { CalendarDays, ChartCandlestick, ClipboardCheck, NotebookPen, ShieldCheck, Wrench } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/layout/empty-state";
import { SignupPrompt } from "@/components/analytics/signup-prompt";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import {
  TradingPlanForm,
  type TradingPlanFormValue,
  type TradingPlanSymbolPlan,
} from "./trading-plan-form";

export const dynamic = "force-dynamic";

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function parseDateParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return dateOnly(new Date());
  return raw;
}

function dateFromDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function parseSymbolPlans(value: unknown): TradingPlanSymbolPlan[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const symbol = typeof record.symbol === "string" ? record.symbol : "";
      const bias = record.bias;
      if (!symbol) return null;
      return {
        id: typeof record.id === "string" ? record.id : symbol,
        symbol,
        bias:
          bias === "BULLISH" || bias === "BEARISH" || bias === "RANGE" || bias === "WAIT"
            ? bias
            : "WAIT",
        keyLevels: typeof record.keyLevels === "string" ? record.keyLevels : null,
        newsToAvoid: typeof record.newsToAvoid === "string" ? record.newsToAvoid : null,
        notes: typeof record.notes === "string" ? record.notes : null,
      } satisfies TradingPlanSymbolPlan;
    })
    .filter((item): item is TradingPlanSymbolPlan => item !== null);
}

function parsePrefillText(value: string | string[] | undefined, maxLength: number) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed.slice(0, maxLength) : null;
}

function parsePrefillSymbol(value: string | string[] | undefined) {
  const raw = parsePrefillText(value, 32);
  if (!raw) return null;
  const symbol = raw.toUpperCase().replace(/[^A-Z0-9._:-]/g, "");
  return symbol.length >= 2 ? symbol : null;
}

function parsePrefillRisk(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tradingPlan");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function TradingPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{
    date?: string | string[];
    symbol?: string | string[];
    riskPct?: string | string[];
    news?: string | string[];
  }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("tradingPlan");

  const selectedDate = parseDateParam(sp?.date);
  const selectedPlanDate = dateFromDateOnly(selectedDate);
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="space-y-6">
        <header className="space-y-2">
          <Badge variant="outline" className="border-primary/30 text-primary">
            {t("eyebrow")}
          </Badge>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {t("title")}
          </h1>
          <p className="max-w-3xl text-muted-foreground">{t("description")}</p>
        </header>
        <EmptyState
          title={t("loginRequired")}
          description={t("loginHint")}
          primary={{ href: "/auth/signin?callbackUrl=/plan", label: t("loginRequired") }}
        />
        <SignupPrompt
          surface="trading-plan"
          title={t("signupPromptTitle")}
          description={t("signupPromptDesc")}
          ctaLabel={t("signupPromptCta")}
          href="/auth/register?callbackUrl=/plan"
        />
      </div>
    );
  }

  const recentSince = new Date(selectedPlanDate);
  recentSince.setUTCDate(recentSince.getUTCDate() - 6);

  const [plan, recentPlans] = await Promise.all([
    prisma.dailyTradingPlan.findUnique({
      where: {
        userId_planDate: {
          userId: session.user.id,
          planDate: selectedPlanDate,
        },
      },
    }),
    prisma.dailyTradingPlan.findMany({
      where: {
        userId: session.user.id,
        planDate: { gte: recentSince, lte: selectedPlanDate },
      },
      orderBy: { planDate: "desc" },
      select: { planDate: true, completedAt: true },
    }),
  ]);

  const completedDays = recentPlans.filter((item) => item.completedAt).length;
  const plannedDays = recentPlans.length;
  const checklistCount = plan
    ? [
        plan.checkedNews,
        plan.checkedLevels,
        plan.checkedRisk,
        plan.checkedEmotion,
        plan.checkedJournal,
      ].filter(Boolean).length
    : 0;

  const prefillSymbol = parsePrefillSymbol(sp?.symbol);
  const prefillRiskPct = parsePrefillRisk(sp?.riskPct);
  const prefillNews = parsePrefillText(sp?.news, 1200);
  const savedSymbolPlans = parseSymbolPlans(plan?.symbolPlans);
  const symbolPlans =
    savedSymbolPlans.length > 0
      ? savedSymbolPlans
      : prefillSymbol
        ? [
            {
              id: prefillSymbol,
              symbol: prefillSymbol,
              bias: "WAIT" as const,
              keyLevels: null,
              newsToAvoid: prefillNews,
              notes: null,
            },
          ]
        : [];

  const formValue: TradingPlanFormValue = {
    planDate: selectedDate,
    watchedSymbols:
      plan?.watchedSymbols && plan.watchedSymbols.length > 0
        ? plan.watchedSymbols
        : prefillSymbol
          ? [prefillSymbol]
          : [],
    symbolPlans,
    bias: plan?.bias ?? "WAIT",
    chartImageUrls: plan?.chartImageUrls ?? [],
    keyLevels: plan?.keyLevels ?? null,
    newsToAvoid: plan?.newsToAvoid ?? prefillNews,
    maxRiskPercent: plan?.maxRiskPercent ?? prefillRiskPct,
    maxTrades: plan?.maxTrades ?? null,
    sessionFocus: plan?.sessionFocus ?? null,
    notes: plan?.notes ?? null,
    checkedNews: plan?.checkedNews ?? false,
    checkedLevels: plan?.checkedLevels ?? false,
    checkedRisk: plan?.checkedRisk ?? false,
    checkedEmotion: plan?.checkedEmotion ?? false,
    checkedJournal: plan?.checkedJournal ?? false,
    completedAt: plan?.completedAt?.toISOString() ?? null,
  };

  const supportLinks = [
    { href: "/calendar" as const, label: t("supportCalendar"), icon: CalendarDays },
    { href: "/chart" as const, label: t("supportChart"), icon: ChartCandlestick },
    { href: "/tools" as const, label: t("supportTools"), icon: Wrench },
    { href: "/journal" as const, label: t("supportJournal"), icon: NotebookPen },
  ];

  return (
    <div className="space-y-8">
      <header className="grid gap-5 border-b border-border pb-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="space-y-2">
          <Badge variant="outline" className="border-primary/30 text-primary">
            {t("eyebrow")}
          </Badge>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {t("title")}
          </h1>
          <p className="max-w-3xl text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {supportLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <item.icon className="mr-2 size-4" aria-hidden />
              {item.label}
            </Link>
          ))}
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Card className="rounded-lg border-border/60 bg-card/60">
          <CardHeader className="pb-2">
            <CardDescription>{t("statChecklist")}</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums text-primary">
              {checklistCount}/5
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {t("statChecklistDesc")}
          </CardContent>
        </Card>
        <Card className="rounded-lg border-border/60 bg-card/60">
          <CardHeader className="pb-2">
            <CardDescription>{t("statPlanned")}</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums text-foreground">
              {plannedDays}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {t("statPlannedDesc")}
          </CardContent>
        </Card>
        <Card className="rounded-lg border-border/60 bg-card/60">
          <CardHeader className="pb-2">
            <CardDescription>{t("statCompleted")}</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums text-chart-1">
              {completedDays}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" aria-hidden />
            {t("statCompletedDesc")}
          </CardContent>
        </Card>
      </section>

      <TradingPlanForm plan={formValue} />

      {recentPlans.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-medium text-foreground">
            {t("recentTitle")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {recentPlans.map((item) => {
              const date = dateOnly(item.planDate);
              return (
                <Link
                  key={date}
                  href={{ pathname: "/plan", query: { date } }}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition hover:border-primary/35 hover:bg-muted/40",
                    item.completedAt
                      ? "border-primary/25 bg-primary/8 text-primary"
                      : "border-border bg-card/50 text-muted-foreground",
                  )}
                >
                  <ClipboardCheck className="size-4" aria-hidden />
                  {date}
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
