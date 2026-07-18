import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SignupPrompt } from "@/components/analytics/signup-prompt";
import { EmptyState } from "@/components/layout/empty-state";
import { JournalStats } from "./journal-stats";
import { JournalTable } from "./journal-table";
import { JournalHeader } from "./journal-header";
import { JournalLivePanel, type LivePosition } from "./journal-live-panel";
import { JournalMt5Prompt } from "./journal-mt5-prompt";
import { JournalPerformanceChart } from "./journal-performance-chart";
import { JournalAiPanel } from "./journal-ai-panel";
import { JournalWeeklyReview } from "./journal-weekly-review";
import { JournalEdgeAnalytics } from "./journal-edge-analytics";
import { RiskCalculator } from "@/components/tools/risk-calculator";
import { countTrailingLosses } from "@/lib/journal/loss-streak";
import { computeRStats } from "@/lib/journal/r-multiple";
import type { AiJournalAnalysis } from "@/lib/ai/types";
import { AlertTriangle } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("journal");
  return { title: t("title"), description: t("description") };
}

export const dynamic = "force-dynamic";

function parseMql5Time(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  const iso = v.replace(/^(\d{4})\.(\d{2})\.(\d{2})/, "$1-$2-$3").replace(" ", "T");
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

export default async function JournalPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{
    symbol?: string;
    direction?: string;
    entry?: string;
    stopLoss?: string;
    takeProfit?: string;
    from?: string;
    tab?: string;
  }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("journal");

  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            {t("title")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("description")}</p>
        </div>
        <EmptyState
          title={t("loginRequired")}
          description={t("loginHint")}
          primary={{ href: "/auth/signin?callbackUrl=/journal", label: t("loginRequired") }}
        />
        <SignupPrompt
          surface="journal"
          title={t("signupPromptTitle")}
          description={t("signupPromptDesc")}
          ctaLabel={t("signupPromptCta")}
          href="/auth/register?callbackUrl=/journal"
        />
      </div>
    );
  }

  const activeTab =
    query?.tab === "weekly" ? "weekly" : query?.tab === "edge" ? "edge" : "trades";

  const [trades, mt5Connection, weeklyReviewsRaw] = await Promise.all([
    prisma.tradeJournal.findMany({
      where: { userId: session.user.id },
      orderBy: { openedAt: "desc" },
      take: 200,
    }),
    prisma.mt5Connection.findFirst({
      where: { userId: session.user.id, revokedAt: null },
      orderBy: { lastSeenAt: "desc" },
    }),
    activeTab === "weekly"
      ? prisma.aiWeeklyJournalReview.findMany({
          where: { userId: session.user.id },
          orderBy: { weekStart: "desc" },
          take: 10,
        })
      : Promise.resolve([]),
  ]);

  const weeklyReviews = weeklyReviewsRaw.map((r) => ({
    id: r.id,
    weekStart: r.weekStart.toISOString(),
    weekEnd: r.weekEnd.toISOString(),
    tradeCount: r.tradeCount,
    analysis: r.analysis as AiJournalAnalysis,
  }));

  const closed = trades.filter((t) => t.result !== "PENDING");
  const wins = closed.filter((t) => t.result === "WIN").length;
  const losses = closed.filter((t) => t.result === "LOSS").length;
  const breakevens = closed.filter((t) => t.result === "BREAKEVEN").length;
  const totalPnl = closed.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const avgPnl = closed.length > 0 ? totalPnl / closed.length : 0;
  const winRate =
    wins + losses > 0
      ? Math.round((wins / (wins + losses)) * 100)
      : 0;

  const livePositions: LivePosition[] = [];
  if (mt5Connection && Array.isArray(mt5Connection.lastPositions)) {
    for (const p of mt5Connection.lastPositions as Record<string, unknown>[]) {
      const ticket = p.ticket != null ? String(p.ticket) : null;
      const symbol = typeof p.symbol === "string" ? p.symbol : null;
      const type = typeof p.type === "string" ? p.type : null;
      if (!ticket || !symbol || !type) continue;
      const num = (v: unknown) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };
      livePositions.push({
        ticket,
        symbol,
        type,
        volume: num(p.volume),
        priceOpen: num(p.priceOpen),
        priceCurrent: num(p.priceCurrent),
        stopLoss: num(p.stopLoss),
        takeProfit: num(p.takeProfit),
        profit: num(p.profit),
        swap: num(p.swap),
        openedAt: parseMql5Time(p.openedAt),
        trailingPips: null,
      });
    }
  }

  const mt5Account = mt5Connection
    ? {
        balance: mt5Connection.balance,
        equity: mt5Connection.equity,
        margin: mt5Connection.margin,
        freeMargin: mt5Connection.freeMargin,
        currency: mt5Connection.accountCurrency,
        openPositions: mt5Connection.openPositions,
        lastSeenAt: mt5Connection.lastSeenAt?.toISOString() ?? null,
        autoCloseBeforeWeekend: mt5Connection.autoCloseBeforeWeekend,
      }
    : null;

  const rStats = computeRStats(trades);

  // Loss-streak guard: chuỗi thua liên tiếp trong 24h qua (trades đã sort openedAt desc,
  // sort lại theo closedAt desc cho đúng thứ tự đóng lệnh)
  const lossStreak = countTrailingLosses(
    closed
      .filter((t) => t.closedAt !== null)
      .sort((a, b) => (b.closedAt?.getTime() ?? 0) - (a.closedAt?.getTime() ?? 0)),
  );

  const serialized = trades.map((t) => ({
    id: t.id,
    symbol: t.symbol,
    direction: t.direction,
    entry: t.entry,
    stopLoss: t.stopLoss,
    takeProfit: t.takeProfit,
    exitPrice: t.exitPrice,
    lotSize: t.lotSize,
    result: t.result,
    pnl: t.pnl,
    notes: t.notes,
    openedAt: t.openedAt.toISOString(),
    closedAt: t.closedAt?.toISOString() ?? null,
    copiedFromSignalId: t.copiedFromSignalId,
    setup: t.setup,
  }));

  const prefill = query?.symbol
    ? {
        symbol: query.symbol,
        direction: query.direction,
        entry: query.entry,
        stopLoss: query.stopLoss,
        takeProfit: query.takeProfit,
        from: query.from,
      }
    : undefined;

  return (
    <div className="space-y-8">
      <JournalHeader prefill={prefill} />

      {lossStreak >= 2 && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/20 dark:text-red-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>{t("lossStreakBanner", { count: lossStreak })}</p>
        </div>
      )}

      <JournalStats
        total={trades.length}
        wins={wins}
        losses={losses}
        breakevens={breakevens}
        winRate={winRate}
        totalPnl={totalPnl}
        avgPnl={avgPnl}
        payoffRatio={rStats.payoffRatio}
        avgR={rStats.avgR}
        rCount={rStats.rCount}
      />

      {/* Tab navigation */}
      <nav className="flex gap-1 border-b">
        <Link
          href="/journal"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "trades"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("tabTrades")}
        </Link>
        <Link
          href="/journal?tab=weekly"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "weekly"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("tabWeekly")}
        </Link>
        <Link
          href="/journal?tab=edge"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "edge"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("tabEdge")}
        </Link>
      </nav>

      {activeTab === "weekly" ? (
        <JournalWeeklyReview reviews={weeklyReviews} />
      ) : activeTab === "edge" ? (
        <JournalEdgeAnalytics trades={serialized} />
      ) : (
        <>
          <RiskCalculator defaultBalance={mt5Account?.balance ?? null} />

          <JournalAiPanel tradeCount={trades.length} />

          <JournalPerformanceChart
            trades={serialized}
            locale={locale}
            accountBalance={mt5Connection?.balance ?? mt5Connection?.equity ?? null}
          />

          <JournalLivePanel
            account={mt5Account}
            positions={livePositions}
            locale={locale}
          />

          {trades.length === 0 ? (
            <JournalMt5Prompt />
          ) : (
            <JournalTable trades={serialized} locale={locale} />
          )}
        </>
      )}
    </div>
  );
}
