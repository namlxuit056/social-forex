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
import { JournalDailyReview } from "./journal-daily-review";
import { JournalEdgeAnalytics } from "./journal-edge-analytics";
import { JournalCalendar } from "./journal-calendar";
import { JournalAdvancedStats } from "./journal-advanced-stats";
import { JournalChat } from "./journal-chat";
import { JournalEmotionDiary } from "./journal-emotion-diary";
import { JournalLessons } from "./journal-lessons";
import { RiskCalculator } from "@/components/tools/risk-calculator";
import { countTrailingLosses } from "@/lib/journal/loss-streak";
import { computeEdgeGroups, findBestRow } from "@/lib/journal/edge-stats";
import { parseTradeSetup } from "@/lib/journal/setups";
import { computePlanCompliance } from "@/lib/journal/plan-compliance";
import { computeChecklistCompliance } from "@/lib/journal/checklist-compliance";
import { computeEmotionDiaryCorrelation } from "@/lib/journal/emotion-diary-correlation";
import { computeGuardOverrideStats } from "@/lib/journal/guard-overrides";
import { computeDisciplineScorecard } from "@/lib/journal/discipline-scorecard";
import { computeMistakeStats } from "@/lib/journal/mistake-stats";
import { computeTiltDays } from "@/lib/journal/tilt-days";
import { computeGreenDays } from "@/lib/journal/green-days";
import { computeRStats } from "@/lib/journal/r-multiple";
import { isVipActive } from "@/lib/vip";
import { isMt5LiveRedisEnabled } from "@/lib/mt5/live-redis";
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

// Trần an toàn cho stats/chart/edge — trader tích cực vài năm cũng hiếm khi chạm
const TRADES_CAP = 2000;

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
    query?.tab === "weekly"
      ? "weekly"
      : query?.tab === "daily"
        ? "daily"
        : query?.tab === "edge"
          ? "edge"
          : query?.tab === "stats"
            ? "stats"
            : query?.tab === "chat"
              ? "chat"
              : query?.tab === "emotion"
                ? "emotion"
                : query?.tab === "lessons"
                  ? "lessons"
                  : "trades";

  const [
    tradesRaw,
    mt5Connection,
    weeklyReviewsRaw,
    dailyReviewsRaw,
    dbUser,
    emotionEntriesRaw,
    planLimitsRaw,
    tradingGoalRaw,
    moodCheckinsRaw,
    journalLessonsRaw,
  ] = await Promise.all([
      prisma.tradeJournal.findMany({
        where: { userId: session.user.id },
        orderBy: { openedAt: "desc" },
        take: TRADES_CAP + 1,
      }),
      prisma.mt5Connection.findFirst({
        where: { userId: session.user.id, revokedAt: null },
        orderBy: { lastSeenAt: "desc" },
        include: { user: { select: { copyTradingPaused: true } } },
      }),
      activeTab === "weekly"
        ? prisma.aiWeeklyJournalReview.findMany({
            where: { userId: session.user.id },
            orderBy: { weekStart: "desc" },
            take: 10,
          })
        : Promise.resolve([]),
      activeTab === "daily"
        ? prisma.aiDailyJournalReview.findMany({
            where: { userId: session.user.id },
            orderBy: { day: "desc" },
            take: 14,
          })
        : Promise.resolve([]),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { vipUntil: true },
      }),
      activeTab === "emotion" || activeTab === "stats"
        ? prisma.emotionDiaryEntry.findMany({
            where: { userId: session.user.id },
            orderBy: { date: "desc" },
            take: 365,
          })
        : Promise.resolve([]),
      activeTab === "stats"
        ? prisma.dailyTradingPlan.findMany({
            where: { userId: session.user.id },
            select: {
              planDate: true,
              maxTrades: true,
              checkedNews: true,
              checkedLevels: true,
              checkedRisk: true,
              checkedEmotion: true,
              checkedJournal: true,
            },
          })
        : Promise.resolve([]),
      activeTab === "stats"
        ? prisma.tradingGoal.findUnique({
            where: {
              userId_month: {
                userId: session.user.id,
                month: new Date(
                  Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
                ),
              },
            },
            select: {
              targetWinRate: true,
              targetAvgR: true,
              targetNetPnl: true,
              targetTrades: true,
              note: true,
            },
          })
        : Promise.resolve(null),
      activeTab === "stats"
        ? prisma.moodCheckin.findMany({
            where: { userId: session.user.id },
            orderBy: { day: "desc" },
            take: 365,
            select: { day: true, mood: true },
          })
        : Promise.resolve([]),
      activeTab === "lessons"
        ? prisma.journalLesson.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
            take: 200,
          })
        : Promise.resolve([]),
    ]);

  const emotionEntries = emotionEntriesRaw.map((e) => ({
    id: e.id,
    date: e.date.toISOString().slice(0, 10),
    note: e.note,
  }));

  const isVip = isVipActive(dbUser?.vipUntil);

  const tradesCapped = tradesRaw.length > TRADES_CAP;
  const trades = tradesCapped ? tradesRaw.slice(0, TRADES_CAP) : tradesRaw;

  const weeklyReviews = weeklyReviewsRaw.map((r) => ({
    id: r.id,
    weekStart: r.weekStart.toISOString(),
    weekEnd: r.weekEnd.toISOString(),
    tradeCount: r.tradeCount,
    analysis: r.analysis as AiJournalAnalysis,
  }));

  const dailyReviews = dailyReviewsRaw.map((r) => ({
    id: r.id,
    day: r.day.toISOString(),
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
        autoCloseEndOfDay: mt5Connection.autoCloseEndOfDay,
        closeAllAtBreakeven: mt5Connection.closeAllAtBreakeven,
        scheduledCloseEnabled: mt5Connection.scheduledCloseEnabled,
        scheduledCloseTime: mt5Connection.scheduledCloseTime,
        scheduledCloseTz: mt5Connection.scheduledCloseTz === "vn" ? ("vn" as const) : ("utc" as const),
        copyTradingPaused: mt5Connection.user.copyTradingPaused,
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
    maeProfit: t.maeProfit,
    mfeProfit: t.mfeProfit,
    notes: t.notes,
    openedAt: t.openedAt.toISOString(),
    closedAt: t.closedAt?.toISOString() ?? null,
    copiedFromSignalId: t.copiedFromSignalId,
    setup: t.setup,
    emotion: t.emotion,
    mistakes: t.mistakes,
    imageUrl: t.imageUrl,
    overrodeDailyLimit: t.overrodeDailyLimit,
    overrodeLossStreakGuard: t.overrodeLossStreakGuard,
  }));

  // Setup playbook match: setup có winRate cao nhất (>= 5 lệnh W/L) — dùng để cảnh báo
  // mềm trong form khi lệnh đang log không khớp setup tốt nhất của chính trader đó.
  const bestSetupRow = findBestRow(computeEdgeGroups(serialized).setups);
  const bestSetupKey = bestSetupRow ? parseTradeSetup(bestSetupRow.key) : null;
  const bestSetup =
    bestSetupRow && bestSetupKey
      ? {
          setup: bestSetupKey,
          winRate: bestSetupRow.winRate ?? 0,
          total: bestSetupRow.wins + bestSetupRow.losses,
        }
      : null;

  const planCompliance = computePlanCompliance(
    planLimitsRaw
      .filter((p) => p.maxTrades != null)
      .map((p) => ({ planDate: p.planDate, maxTrades: p.maxTrades as number })),
    serialized,
  );

  const checklistCompliance = computeChecklistCompliance(planLimitsRaw, serialized);

  const emotionCorrelation = computeEmotionDiaryCorrelation(emotionEntries, serialized);

  const guardOverrideStats = computeGuardOverrideStats(serialized);

  const disciplineScorecard = computeDisciplineScorecard({
    trades: serialized,
    plans: planLimitsRaw,
    moods: moodCheckinsRaw.map((m) => ({ day: m.day, mood: m.mood })),
    diary: emotionEntries.map((e) => ({ date: e.date, note: e.note })),
    bestSetup: bestSetupRow?.key ?? null,
  });

  const mistakeStats = computeMistakeStats(serialized);

  const tiltDays = computeTiltDays(
    serialized,
    planLimitsRaw.map((p) => ({ planDate: p.planDate, maxTrades: p.maxTrades })),
  );

  const greenDays = computeGreenDays(
    serialized,
    planLimitsRaw,
    moodCheckinsRaw.map((m) => ({ day: m.day, mood: m.mood })),
    bestSetupRow?.key ?? null,
  );

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
      <JournalHeader prefill={prefill} bestSetup={bestSetup} />

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

      {tradesCapped && (
        <p className="text-xs text-muted-foreground">
          {t("tradesCapNote", { count: TRADES_CAP })}
        </p>
      )}

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
          href="/journal?tab=daily"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "daily"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("tabDaily")}
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
        <Link
          href="/journal?tab=stats"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "stats"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("tabStats")}
        </Link>
        <Link
          href="/journal?tab=chat"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "chat"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("tabChat")}
        </Link>
        <Link
          href="/journal?tab=emotion"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "emotion"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("tabEmotion")}
        </Link>
        <Link
          href="/journal?tab=lessons"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "lessons"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("tabLessons")}
        </Link>
      </nav>

      {activeTab === "weekly" ? (
        <JournalWeeklyReview reviews={weeklyReviews} />
      ) : activeTab === "daily" ? (
        <JournalDailyReview reviews={dailyReviews} />
      ) : activeTab === "edge" ? (
        <JournalEdgeAnalytics trades={serialized} />
      ) : activeTab === "stats" ? (
        <div className="space-y-6">
          <JournalCalendar trades={serialized} locale={locale} />
          <JournalAdvancedStats
            trades={serialized}
            locale={locale}
            accountBalance={mt5Connection?.balance ?? mt5Connection?.equity ?? null}
            planCompliance={planCompliance}
            checklistCompliance={checklistCompliance}
            emotionCorrelation={emotionCorrelation}
            guardOverrideStats={guardOverrideStats}
            scorecard={disciplineScorecard}
            mistakeStats={mistakeStats}
            greenDays={greenDays}
            tiltDays={tiltDays}
            tradingGoal={tradingGoalRaw}
          />
        </div>
      ) : activeTab === "chat" ? (
        <JournalChat isLoggedIn={true} isVip={isVip} />
      ) : activeTab === "emotion" ? (
        <JournalEmotionDiary entries={emotionEntries} locale={locale} />
      ) : activeTab === "lessons" ? (
        <JournalLessons
          lessons={journalLessonsRaw.map((l) => ({
            id: l.id,
            body: l.body,
            imageUrl: l.imageUrl,
            createdAt: l.createdAt.toISOString(),
          }))}
          locale={locale}
        />
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
            liveEnabled={isMt5LiveRedisEnabled()}
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
