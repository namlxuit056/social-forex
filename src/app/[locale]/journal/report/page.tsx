import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeAdvancedStats } from "@/lib/journal/advanced-stats";
import { computeRMultipleDistribution } from "@/lib/journal/r-distribution";
import { computeEdgeGroups } from "@/lib/journal/edge-stats";
import {
  computeGoalProgress,
  goalMonthStart,
  tradesInGoalMonth,
  type GoalMetric,
} from "@/lib/journal/goal-progress";
import { ReportPrintButton } from "@/components/journal/report-print-button";

export const dynamic = "force-dynamic";

const RANGES = { "30": 30, "90": 90, "365": 365, all: null } as const;
type RangeKey = keyof typeof RANGES;
const TRADES_CAP = 3000;

function parseRange(v: string | undefined): RangeKey {
  return v && v in RANGES ? (v as RangeKey) : "90";
}

function fmtMoney(v: number) {
  return `${v >= 0 ? "+" : "-"}$${Math.abs(v).toFixed(2)}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("journal");
  return { title: t("reportTitle"), robots: { index: false } };
}

export default async function JournalReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ range?: string; print?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("journal");

  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        <Link href="/auth/signin?callbackUrl=/journal/report" className="underline">
          {t("loginRequired")}
        </Link>
      </div>
    );
  }

  const rangeKey = parseRange(query?.range);
  const days = RANGES[rangeKey];
  const now = new Date();
  const cutoff = days
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - days)
    : null;

  const [user, tradesRaw, goalRow] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    }),
    prisma.tradeJournal.findMany({
      where: {
        userId: session.user.id,
        result: { not: "PENDING" },
        ...(cutoff ? { closedAt: { gte: cutoff } } : {}),
      },
      orderBy: { closedAt: "asc" },
      take: TRADES_CAP,
    }),
    prisma.tradingGoal.findUnique({
      where: {
        userId_month: { userId: session.user.id, month: goalMonthStart(new Date()) },
      },
      select: {
        targetWinRate: true,
        targetAvgR: true,
        targetNetPnl: true,
        targetTrades: true,
        note: true,
      },
    }),
  ]);

  const trades = tradesRaw.map((tr) => ({
    symbol: tr.symbol,
    direction: tr.direction,
    entry: tr.entry,
    stopLoss: tr.stopLoss,
    exitPrice: tr.exitPrice,
    result: tr.result,
    pnl: tr.pnl,
    openedAt: tr.openedAt.toISOString(),
    closedAt: tr.closedAt ? tr.closedAt.toISOString() : null,
    setup: tr.setup,
    emotion: tr.emotion,
    copiedFromSignalId: tr.copiedFromSignalId,
  }));

  const stats = computeAdvancedStats(trades);
  const dist = computeRMultipleDistribution(trades);
  const edge = computeEdgeGroups(trades);
  const goalProgress = goalRow
    ? computeGoalProgress(goalRow, tradesInGoalMonth(trades, goalMonthStart(new Date())))
    : null;

  // Static equity curve (cumulative P/L over closed trades in order)
  const equity = trades.reduce<number[]>((acc, tr) => {
    const prev = acc.length > 0 ? acc[acc.length - 1] : 0;
    acc.push(prev + (tr.pnl ?? 0));
    return acc;
  }, []);
  const eqMin = Math.min(0, ...equity);
  const eqMax = Math.max(0, ...equity);
  const eqRange = eqMax - eqMin || 1;
  const W = 640;
  const H = 160;
  const eqPath =
    equity.length > 1
      ? equity
          .map((v, i) => {
            const x = (i / (equity.length - 1)) * W;
            const y = H - ((v - eqMin) / eqRange) * H;
            return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(" ")
      : "";
  const zeroY = H - ((0 - eqMin) / eqRange) * H;

  const rangeLabel = t(`report_range_${rangeKey}` as "report_range_90");
  const firstClose = trades.find((tr) => tr.closedAt)?.closedAt;
  const lastClose = [...trades].reverse().find((tr) => tr.closedAt)?.closedAt;
  const dateFmt = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });

  const metricLabel: Record<GoalMetric, string> = {
    winRate: t("goalWinRate"),
    avgR: t("goalAvgR"),
    netPnl: t("goalNetPnl"),
    trades: t("goalTrades"),
  };
  const fmtGoal = (m: GoalMetric, v: number) =>
    m === "winRate"
      ? `${v.toFixed(0)}%`
      : m === "avgR"
        ? `${v >= 0 ? "+" : ""}${v.toFixed(2)}R`
        : m === "netPnl"
          ? fmtMoney(v)
          : String(Math.round(v));

  const topSetups = [...edge.setups]
    .filter((r) => r.wins + r.losses >= 3)
    .sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0))
    .slice(0, 5);
  const sessionRows = edge.sessions.filter((r) => r.wins + r.losses >= 1);
  const sessionName = (k: string) =>
    k === "asia" ? t("sessionAsia") : k === "london" ? t("sessionLondon") : t("sessionNewYork");

  const statItems: { label: string; value: string; tone?: "pos" | "neg" }[] = [
    { label: t("totalTrades"), value: String(stats.closedTrades) },
    {
      label: t("winRate"),
      value: stats.winRate !== null ? `${stats.winRate}%` : "—",
      tone: stats.winRate !== null && stats.winRate >= 50 ? "pos" : "neg",
    },
    {
      label: t("statProfitFactor"),
      value:
        stats.profitFactor === Infinity
          ? "∞"
          : stats.profitFactor !== null
            ? stats.profitFactor.toFixed(2)
            : "—",
      tone: (stats.profitFactor ?? 0) >= 1 ? "pos" : "neg",
    },
    {
      label: t("expectancyR"),
      value: stats.avgRR !== null ? `${stats.avgRR >= 0 ? "+" : ""}${stats.avgRR}R` : "—",
      tone: (stats.avgRR ?? 0) >= 0 ? "pos" : "neg",
    },
    {
      label: t("totalPnl"),
      value: fmtMoney(stats.netProfit),
      tone: stats.netProfit >= 0 ? "pos" : "neg",
    },
    {
      label: t("statExpectancy"),
      value: stats.expectancy !== null ? fmtMoney(stats.expectancy) : "—",
      tone: (stats.expectancy ?? 0) >= 0 ? "pos" : "neg",
    },
    {
      label: t("statMaxDrawdown"),
      value: stats.maxDrawdown < 0 ? fmtMoney(stats.maxDrawdown) : "—",
      tone: "neg",
    },
    {
      label: t("statSharpeRatio"),
      value: stats.sharpeRatio !== null ? stats.sharpeRatio.toFixed(2) : "—",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6 bg-background px-4 py-6 text-foreground print:px-0 print:py-0">
      <div className="flex items-start justify-between gap-4 print:hidden">
        <Link href="/journal?tab=stats" className="text-sm text-muted-foreground underline">
          ← {t("tabStats")}
        </Link>
        <div className="flex items-center gap-2">
          {(Object.keys(RANGES) as RangeKey[]).map((k) => (
            <Link
              key={k}
              href={`/journal/report?range=${k}`}
              className={`rounded-full border px-2.5 py-0.5 text-xs ${
                k === rangeKey
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              {t(`report_range_${k}` as "report_range_90")}
            </Link>
          ))}
          <ReportPrintButton autoPrompt={query?.print === "1"} />
        </div>
      </div>

      {/* Report header */}
      <div className="border-b border-border pb-4">
        <h1 className="font-heading text-xl font-bold">{t("reportTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user?.name || user?.email} · {rangeLabel}
          {firstClose && lastClose ? ` · ${dateFmt(firstClose)} – ${dateFmt(lastClose)}` : ""}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("reportGeneratedAt", { date: new Date().toLocaleString(locale) })}
        </p>
      </div>

      {stats.closedTrades === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">{t("reportEmpty")}</p>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {statItems.map((s) => (
              <div key={s.label} className="rounded-lg border border-border p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </p>
                <p
                  className={`mt-1 font-mono text-base font-bold ${
                    s.tone === "pos"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : s.tone === "neg"
                        ? "text-red-600 dark:text-red-400"
                        : ""
                  }`}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Equity curve */}
          <section>
            <h2 className="mb-2 text-sm font-semibold">{t("reportEquityTitle")}</h2>
            <div className="rounded-lg border border-border p-3">
              <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full" preserveAspectRatio="none">
                <line x1={0} x2={W} y1={zeroY} y2={zeroY} className="stroke-border" strokeWidth="1" />
                {eqPath && (
                  <path
                    d={eqPath}
                    fill="none"
                    className={stats.netProfit >= 0 ? "stroke-emerald-500" : "stroke-red-500"}
                    strokeWidth="1.5"
                  />
                )}
              </svg>
            </div>
          </section>

          {/* Goal progress */}
          {goalProgress && goalProgress.totalCount > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold">
                {t("goalTitle", {
                  month: goalMonthStart(new Date()).toLocaleDateString(locale, {
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  }),
                })}{" "}
                · {t("goalMetCount", { met: goalProgress.metCount, total: goalProgress.totalCount })}
              </h2>
              <div className="space-y-2 rounded-lg border border-border p-3">
                {goalProgress.items.map((it) => (
                  <div key={it.metric} className="flex items-center justify-between text-xs">
                    <span>{metricLabel[it.metric]}</span>
                    <span className="font-mono">
                      <span className={it.met ? "text-emerald-600 dark:text-emerald-400" : ""}>
                        {fmtGoal(it.metric, it.actual)}
                      </span>{" "}
                      / {fmtGoal(it.metric, it.target)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* R distribution */}
          {dist.total > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold">{t("rDistTitle")}</h2>
              <div className="grid grid-cols-6 gap-2 rounded-lg border border-border p-3 text-center">
                {dist.buckets.map((b) => (
                  <div key={b.key}>
                    <p
                      className={`font-mono text-base font-bold ${
                        b.win ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {b.count}
                    </p>
                    <p className="text-[9px] text-muted-foreground">{b.label}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Edge tables */}
          <div className="grid gap-4 sm:grid-cols-2">
            {topSetups.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-semibold">{t("reportTopSetups")}</h2>
                <table className="w-full text-xs">
                  <tbody>
                    {topSetups.map((r) => (
                      <tr key={r.key} className="border-b border-border">
                        <td className="py-1">{r.key}</td>
                        <td className="py-1 text-right font-mono">{r.winRate ?? "—"}%</td>
                        <td className="py-1 text-right font-mono text-muted-foreground">
                          {r.wins + r.losses}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
            {sessionRows.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-semibold">{t("statsBySessionTitle")}</h2>
                <table className="w-full text-xs">
                  <tbody>
                    {sessionRows.map((r) => (
                      <tr key={r.key} className="border-b border-border">
                        <td className="py-1">{sessionName(r.key)}</td>
                        <td className="py-1 text-right font-mono">{r.winRate ?? "—"}%</td>
                        <td className="py-1 text-right font-mono text-muted-foreground">
                          {r.wins + r.losses}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </div>
        </>
      )}

      <p className="border-t border-border pt-3 text-[10px] text-muted-foreground">
        {t("reportDisclaimer")}
      </p>
    </div>
  );
}
