"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { computeAdvancedStats, type AdvancedStatsTrade } from "@/lib/journal/advanced-stats";
import {
  computeMonthlyViolations,
  computeRiskDiscipline,
  type DisciplineTrade,
} from "@/lib/journal/risk-discipline";
import {
  computeDayOfWeekStats,
  computeSessionStats,
  computeSymbolStats,
  computeTimeWindowStats,
  VN_UTC_OFFSET_HOURS,
  type GroupStat,
  type SessionTimeTrade,
  type SymbolTrade,
} from "@/lib/journal/session-time-stats";
import type { EdgeSession } from "@/lib/journal/edge-stats";
import type { PlanComplianceStats } from "@/lib/journal/plan-compliance";
import type { ChecklistComplianceStats } from "@/lib/journal/checklist-compliance";
import type { EmotionDiaryCorrelationStats } from "@/lib/journal/emotion-diary-correlation";
import type { GuardOverrideStats } from "@/lib/journal/guard-overrides";

export type AdvancedStatsPageTrade = AdvancedStatsTrade &
  DisciplineTrade &
  SessionTimeTrade &
  SymbolTrade;

const MIN_CLOSED_TRADES = 5;

function fmtMoney(v: number) {
  const sign = v >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(v).toFixed(2)}`;
}

function fmtDuration(minutes: number) {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function StatCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string | null;
  tone?: "positive" | "negative" | "neutral";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border-l-2 border-y border-r border-border/60 p-3",
        tone === "positive" && "border-l-emerald-500",
        tone === "negative" && "border-l-red-500",
        tone === "neutral" && "border-l-border",
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 font-mono text-lg font-bold tabular-nums",
          tone === "positive" && "text-emerald-500",
          tone === "negative" && "text-red-500",
          tone === "neutral" && "text-foreground",
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[10px] text-muted-foreground/70">{sub}</p>}
    </div>
  );
}

function GroupStatsTable({
  title,
  rows,
  emptyLabel,
  labelOf,
  headerAction,
  bestKey,
}: {
  title: string;
  rows: { key: string; stat: GroupStat | null }[];
  emptyLabel: string;
  labelOf: (key: string) => string;
  headerAction?: React.ReactNode;
  bestKey?: string;
}) {
  const t = useTranslations("journal");
  const hasAny = rows.some((r) => r.stat !== null);
  return (
    <Card className="border-border/60">
      <CardHeader className="flex-row items-center justify-between gap-3 pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        {headerAction}
      </CardHeader>
      <CardContent>
        {!hasAny ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {rows
              .filter((r) => r.stat !== null)
              .map(({ key, stat }) => (
                <div key={key} className="space-y-1.5 text-sm">
                  <p className="flex items-center gap-1 font-semibold text-amber-500">
                    {key === bestKey && <span aria-hidden>🏆</span>}
                    {labelOf(key)}
                  </p>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("totalTrades")}</span>
                    <span className="font-mono text-foreground">{stat!.total}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("winRate")}</span>
                    <span
                      className={cn(
                        "font-mono",
                        stat!.winRate === null
                          ? "text-foreground"
                          : stat!.winRate >= 50
                            ? "text-emerald-500"
                            : "text-red-500",
                      )}
                    >
                      {stat!.winRate !== null ? `${stat!.winRate}%` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("totalPnl")}</span>
                    <span
                      className={cn(
                        "font-mono",
                        stat!.netPnl >= 0 ? "text-emerald-500" : "text-red-500",
                      )}
                    >
                      {fmtMoney(stat!.netPnl)}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("expectancyR")}</span>
                    <span className="font-mono text-foreground">
                      {stat!.avgR !== null ? `${stat!.avgR >= 0 ? "+" : ""}${stat!.avgR}R` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("statExpectancy")}</span>
                    <span
                      className={cn(
                        "font-mono",
                        (stat!.expectancy ?? 0) >= 0 ? "text-emerald-500" : "text-red-500",
                      )}
                    >
                      {stat!.expectancy !== null ? fmtMoney(stat!.expectancy) : "—"}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ComplianceDonut({
  compliant,
  violations,
  insufficient,
}: {
  compliant: number;
  violations: number;
  insufficient: number;
}) {
  const t = useTranslations("journal");
  const total = compliant + violations + insufficient;
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const compliantRate = total > 0 ? Math.round((compliant / total) * 100) : null;

  const segments =
    total > 0
      ? [
          { value: compliant, className: "stroke-emerald-500" },
          { value: violations, className: "stroke-red-500" },
          { value: insufficient, className: "stroke-muted-foreground/40" },
        ]
      : [];

  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 140 140" className="size-40">
        <circle cx="70" cy="70" r={r} fill="none" strokeWidth="16" className="stroke-muted" />
        {segments.map((seg, i) => {
          const len = (seg.value / total) * circumference;
          const dasharray = `${len} ${circumference - len}`;
          const el = (
            <circle
              key={i}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              strokeWidth="16"
              strokeDasharray={dasharray}
              strokeDashoffset={-offset}
              transform="rotate(-90 70 70)"
              className={seg.className}
            />
          );
          offset += len;
          return el;
        })}
        <text
          x="70"
          y="66"
          textAnchor="middle"
          className="fill-foreground text-2xl font-bold"
        >
          {compliantRate !== null ? `${compliantRate}%` : "—"}
        </text>
        <text
          x="70"
          y="86"
          textAnchor="middle"
          className="fill-muted-foreground text-[10px]"
        >
          {t("riskComplianceRateLabel")}
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-500" />
          {t("riskCompliantLegend")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-red-500" />
          {t("riskViolationLegend")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-muted-foreground/40" />
          {t("riskNALegend")}
        </span>
      </div>
      {total === 0 && (
        <p className="max-w-56 text-center text-xs text-muted-foreground">
          {t("riskNotEnoughData")}
        </p>
      )}
    </div>
  );
}

function MonthlyViolationsChart({
  data,
}: {
  data: { key: string; label: string; violations: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.violations));
  const width = 320;
  const height = 160;
  const barGap = 8;
  const barWidth = data.length > 0 ? Math.max(8, width / data.length - barGap) : 0;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={0}
          x2={width}
          y1={height - 24 - f * (height - 40)}
          y2={height - 24 - f * (height - 40)}
          className="stroke-border/40"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      ))}
      {data.map((d, i) => {
        const barHeight = (d.violations / max) * (height - 40);
        const x = i * (barWidth + barGap);
        const y = height - 24 - barHeight;
        return (
          <g key={d.key}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(1, barHeight)}
              rx="2"
              className={d.violations > 0 ? "fill-red-500/70" : "fill-muted"}
            />
            <text
              x={x + barWidth / 2}
              y={height - 8}
              textAnchor="middle"
              className="fill-muted-foreground text-[9px]"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function JournalAdvancedStats({
  trades,
  locale,
  accountBalance,
  planCompliance,
  checklistCompliance,
  emotionCorrelation,
  guardOverrideStats,
}: {
  trades: AdvancedStatsPageTrade[];
  locale: string;
  accountBalance: number | null;
  planCompliance?: PlanComplianceStats;
  checklistCompliance?: ChecklistComplianceStats;
  emotionCorrelation?: EmotionDiaryCorrelationStats;
  guardOverrideStats?: GuardOverrideStats;
}) {
  const t = useTranslations("journal");

  const stats = useMemo(
    () => computeAdvancedStats(trades, accountBalance),
    [trades, accountBalance],
  );
  const discipline = useMemo(() => computeRiskDiscipline(trades), [trades]);
  const monthlyViolations = useMemo(
    () => computeMonthlyViolations(trades, locale),
    [trades, locale],
  );
  const sessionStats = useMemo(() => computeSessionStats(trades), [trades]);
  const [timeWindowTz, setTimeWindowTz] = useState<"vn" | "utc">("vn");
  const timeWindowStats = useMemo(
    () => computeTimeWindowStats(trades, timeWindowTz === "vn" ? VN_UTC_OFFSET_HOURS : 0),
    [trades, timeWindowTz],
  );
  const symbolStats = useMemo(() => computeSymbolStats(trades), [trades]);
  const dayOfWeekStats = useMemo(
    () => computeDayOfWeekStats(trades, timeWindowTz === "vn" ? VN_UTC_OFFSET_HOURS : 0),
    [trades, timeWindowTz],
  );

  if (stats.closedTrades < MIN_CLOSED_TRADES) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center">
        <BarChart3 className="size-10 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          {t("edgeEmpty", { min: MIN_CLOSED_TRADES })}
        </p>
      </div>
    );
  }

  const streakLabel =
    stats.currentStreak.type && stats.currentStreak.count > 0
      ? `${stats.currentStreak.count}${stats.currentStreak.type === "WIN" ? "W" : "L"}`
      : "—";

  const sessionLabel = (key: string) =>
    key === "asia" ? t("sessionAsia") : key === "london" ? t("sessionLondon") : t("sessionNewYork");

  const sessionRows: { key: string; stat: GroupStat | null }[] = (
    ["asia", "london", "newyork"] as EdgeSession[]
  ).map((key) => ({ key, stat: sessionStats[key] }));

  const timeRows = timeWindowStats.map((s) => ({ key: s.key, stat: s }));
  const symbolRows = symbolStats.map((s) => ({ key: s.symbol, stat: s }));
  const bestSymbol = symbolStats[0]?.symbol;
  const dayOfWeekRows = dayOfWeekStats.map((s) => ({ key: s.key, stat: s }));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-heading text-lg font-semibold">{t("statsAdvancedTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("statsAdvancedDesc")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label={t("totalTrades")} value={String(stats.totalTrades)} />
        <StatCard
          label={t("winRate")}
          value={stats.winRate !== null ? `${stats.winRate}%` : "—"}
          tone={stats.winRate === null ? "neutral" : stats.winRate >= 50 ? "positive" : "negative"}
        />
        <StatCard
          label={t("statProfitFactor")}
          value={
            stats.profitFactor === Infinity
              ? "∞"
              : stats.profitFactor !== null
                ? stats.profitFactor.toFixed(2)
                : "—"
          }
          tone={
            stats.profitFactor === null
              ? "neutral"
              : stats.profitFactor === Infinity || stats.profitFactor >= 1
                ? "positive"
                : "negative"
          }
        />
        <StatCard
          label={t("expectancyR")}
          value={stats.avgRR !== null ? `${stats.avgRR >= 0 ? "+" : ""}${stats.avgRR}R` : "—"}
          tone={stats.avgRR === null ? "neutral" : stats.avgRR >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label={t("statAvgWin")}
          value={stats.avgWin !== null ? fmtMoney(stats.avgWin) : "—"}
          tone="positive"
        />
        <StatCard
          label={t("statAvgLoss")}
          value={stats.avgLoss !== null ? `-$${stats.avgLoss.toFixed(2)}` : "—"}
          tone="negative"
        />

        <StatCard
          label={t("statExpectancy")}
          value={stats.expectancy !== null ? fmtMoney(stats.expectancy) : "—"}
          tone={stats.expectancy === null ? "neutral" : stats.expectancy >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label={t("totalPnl")}
          value={fmtMoney(stats.netProfit)}
          tone={stats.netProfit >= 0 ? "positive" : "negative"}
        />
        <StatCard label={t("statWins")} value={String(stats.wins)} tone="positive" />
        <StatCard label={t("statLosses")} value={String(stats.losses)} tone="negative" />
        <StatCard label={t("statBreakevens")} value={String(stats.breakevens)} />
        <StatCard label={t("statCurrentStreak")} value={streakLabel} tone={stats.currentStreak.type === "WIN" ? "positive" : stats.currentStreak.type === "LOSS" ? "negative" : "neutral"} />

        <StatCard label={t("statLongestWinStreak")} value={String(stats.longestWinStreak)} tone="positive" />
        <StatCard label={t("statLongestLossStreak")} value={String(stats.longestLossStreak)} tone="negative" />
        <StatCard
          label={t("statMaxDrawdown")}
          value={stats.maxDrawdown < 0 ? fmtMoney(stats.maxDrawdown) : "—"}
          tone={stats.maxDrawdown < 0 ? "negative" : "neutral"}
        />
        <StatCard
          label={t("statRecoveryFactor")}
          value={stats.recoveryFactor !== null ? stats.recoveryFactor.toFixed(2) : "—"}
          tone={stats.recoveryFactor === null ? "neutral" : stats.recoveryFactor >= 1 ? "positive" : "negative"}
        />
        <StatCard
          label={t("statSharpeRatio")}
          value={stats.sharpeRatio !== null ? stats.sharpeRatio.toFixed(2) : "—"}
          tone={stats.sharpeRatio === null ? "neutral" : stats.sharpeRatio >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label={t("statAvgHoldingTime")}
          value={stats.avgHoldingMinutes !== null ? fmtDuration(stats.avgHoldingMinutes) : "—"}
        />

        <StatCard
          label={t("statLargestWin")}
          value={stats.largestWin !== null ? fmtMoney(stats.largestWin) : "—"}
          tone="positive"
        />
        <StatCard
          label={t("statLargestLoss")}
          value={stats.largestLoss !== null ? fmtMoney(stats.largestLoss) : "—"}
          tone="negative"
        />
        <StatCard label={t("statGrossProfit")} value={fmtMoney(stats.grossProfit)} tone="positive" />
        <StatCard label={t("statGrossLoss")} value={`-$${stats.grossLoss.toFixed(2)}`} tone="negative" />
        <StatCard
          label={t("statRoi")}
          value={stats.roi !== null ? `${stats.roi >= 0 ? "+" : ""}${stats.roi}%` : "—"}
          tone={stats.roi === null ? "neutral" : stats.roi >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label={t("statAvgRisk")}
          value={stats.avgRisk !== null ? `$${stats.avgRisk.toFixed(2)}` : "—"}
        />

        <StatCard
          label={t("statRiskOfRuin")}
          value={stats.riskOfRuin !== null ? `${(stats.riskOfRuin * 100).toFixed(1)}%` : "—"}
          tone={stats.riskOfRuin === null ? "neutral" : stats.riskOfRuin < 0.05 ? "positive" : "negative"}
        />
      </div>

      <GroupStatsTable
        title={t("statsBySessionTitle")}
        rows={sessionRows}
        labelOf={sessionLabel}
        emptyLabel={t("edgeEmpty", { min: MIN_CLOSED_TRADES })}
      />

      <GroupStatsTable
        title={t("statsByTimeTitle")}
        rows={timeRows}
        labelOf={(k) => `${k} ${timeWindowTz === "vn" ? t("tzVietnamShort") : "UTC"}`}
        emptyLabel={t("statsByTimeEmpty")}
        headerAction={
          <div className="flex rounded-md border border-border/60 p-0.5">
            {(["vn", "utc"] as const).map((tz) => (
              <button
                key={tz}
                type="button"
                onClick={() => setTimeWindowTz(tz)}
                className={cn(
                  "inline-flex h-6 items-center rounded-sm px-2 text-[11px] font-medium transition-colors",
                  timeWindowTz === tz
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tz === "vn" ? t("tzVietnam") : t("tzUtc")}
              </button>
            ))}
          </div>
        }
      />

      <GroupStatsTable
        title={t("statsByPairTitle")}
        rows={symbolRows}
        labelOf={(k) => k}
        emptyLabel={t("statsByPairEmpty", { min: 3 })}
        bestKey={bestSymbol}
      />

      <GroupStatsTable
        title={t("statsByDayOfWeekTitle")}
        rows={dayOfWeekRows}
        labelOf={(k) => t(`calWeekday${k}`)}
        emptyLabel={t("edgeEmpty", { min: MIN_CLOSED_TRADES })}
      />

      <div>
        <h3 className="font-heading text-lg font-semibold">{t("riskDisciplineTitle")}</h3>
        <p className="mb-3 text-sm text-muted-foreground">{t("riskDisciplineNote")}</p>

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label={t("riskEvaluable")} value={String(discipline.evaluable)} />
          <StatCard label={t("riskCompliant")} value={String(discipline.compliant)} tone="positive" />
          <StatCard label={t("riskViolations")} value={String(discipline.violations)} tone="negative" />
          <StatCard
            label={t("riskComplianceRate")}
            value={discipline.complianceRate !== null ? `${discipline.complianceRate}%` : "—"}
            tone={
              discipline.complianceRate === null
                ? "neutral"
                : discipline.complianceRate >= 80
                  ? "positive"
                  : "negative"
            }
          />
          <StatCard label={t("riskInsufficientData")} value={String(discipline.insufficientData)} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t("riskComplianceChartTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center py-4">
              <ComplianceDonut
                compliant={discipline.compliant}
                violations={discipline.violations}
                insufficient={discipline.insufficientData}
              />
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t("riskMonthlyChartTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyViolationsChart data={monthlyViolations} />
            </CardContent>
          </Card>
        </div>
      </div>

      {planCompliance && planCompliance.evaluableDays > 0 && (
        <div>
          <h3 className="font-heading text-lg font-semibold">{t("planComplianceTitle")}</h3>
          <p className="mb-3 text-sm text-muted-foreground">{t("planComplianceNote")}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard
              label={t("planComplianceDays")}
              value={`${planCompliance.compliantDays}/${planCompliance.evaluableDays}`}
            />
            <StatCard
              label={t("riskComplianceRate")}
              value={
                planCompliance.complianceRate !== null
                  ? `${planCompliance.complianceRate}%`
                  : "—"
              }
              tone={
                planCompliance.complianceRate === null
                  ? "neutral"
                  : planCompliance.complianceRate >= 80
                    ? "positive"
                    : "negative"
              }
            />
          </div>
        </div>
      )}

      {checklistCompliance && checklistCompliance.evaluableDays > 0 && (
        <div>
          <h3 className="font-heading text-lg font-semibold">{t("checklistComplianceTitle")}</h3>
          <p className="mb-3 text-sm text-muted-foreground">{t("checklistComplianceNote")}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label={t("checklistComplianceDays")}
              value={`${checklistCompliance.completeDays}/${checklistCompliance.evaluableDays}`}
            />
            <StatCard
              label={t("riskComplianceRate")}
              value={
                checklistCompliance.completionRate !== null
                  ? `${checklistCompliance.completionRate}%`
                  : "—"
              }
              tone={
                checklistCompliance.completionRate === null
                  ? "neutral"
                  : checklistCompliance.completionRate >= 80
                    ? "positive"
                    : "negative"
              }
            />
            <StatCard
              label={t("checklistWinRateComplete")}
              value={
                checklistCompliance.complete.winRate !== null
                  ? `${checklistCompliance.complete.winRate}%`
                  : "—"
              }
              sub={
                checklistCompliance.complete.winRate !== null
                  ? `${checklistCompliance.complete.wins}W / ${checklistCompliance.complete.losses}L`
                  : null
              }
              tone={
                checklistCompliance.complete.winRate === null
                  ? "neutral"
                  : checklistCompliance.complete.winRate >= 50
                    ? "positive"
                    : "negative"
              }
            />
            <StatCard
              label={t("checklistWinRateIncomplete")}
              value={
                checklistCompliance.incomplete.winRate !== null
                  ? `${checklistCompliance.incomplete.winRate}%`
                  : "—"
              }
              sub={
                checklistCompliance.incomplete.winRate !== null
                  ? `${checklistCompliance.incomplete.wins}W / ${checklistCompliance.incomplete.losses}L`
                  : null
              }
              tone={
                checklistCompliance.incomplete.winRate === null
                  ? "neutral"
                  : checklistCompliance.incomplete.winRate >= 50
                    ? "positive"
                    : "negative"
              }
            />
          </div>
        </div>
      )}

      {emotionCorrelation && emotionCorrelation.negativeDays > 0 && (
        <div>
          <h3 className="font-heading text-lg font-semibold">{t("emotionCorrelationTitle")}</h3>
          <p className="mb-3 text-sm text-muted-foreground">{t("emotionCorrelationNote")}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard
              label={t("emotionCorrelationNegativeDays")}
              value={String(emotionCorrelation.negativeDays)}
              tone="negative"
            />
            <StatCard
              label={t("emotionCorrelationWinRateNegative")}
              value={
                emotionCorrelation.negative.winRate !== null
                  ? `${emotionCorrelation.negative.winRate}%`
                  : "—"
              }
              sub={
                emotionCorrelation.negative.winRate !== null
                  ? `${emotionCorrelation.negative.wins}W / ${emotionCorrelation.negative.losses}L`
                  : null
              }
              tone={
                emotionCorrelation.negative.winRate === null
                  ? "neutral"
                  : emotionCorrelation.negative.winRate >= 50
                    ? "positive"
                    : "negative"
              }
            />
            <StatCard
              label={t("emotionCorrelationWinRateOther")}
              value={
                emotionCorrelation.nonNegative.winRate !== null
                  ? `${emotionCorrelation.nonNegative.winRate}%`
                  : "—"
              }
              sub={
                emotionCorrelation.nonNegative.winRate !== null
                  ? `${emotionCorrelation.nonNegative.wins}W / ${emotionCorrelation.nonNegative.losses}L`
                  : null
              }
              tone={
                emotionCorrelation.nonNegative.winRate === null
                  ? "neutral"
                  : emotionCorrelation.nonNegative.winRate >= 50
                    ? "positive"
                    : "negative"
              }
            />
          </div>
        </div>
      )}

      {guardOverrideStats && (
        <div>
          <h3 className="font-heading text-lg font-semibold">{t("guardOverrideTitle")}</h3>
          <p className="mb-3 text-sm text-muted-foreground">{t("guardOverrideNote")}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard
              label={t("guardOverrideTotal")}
              value={String(guardOverrideStats.totalOverrides)}
              tone={guardOverrideStats.totalOverrides > 0 ? "negative" : "positive"}
            />
            <StatCard
              label={t("guardOverrideDailyLimit")}
              value={String(guardOverrideStats.dailyLimitOverrides)}
            />
            <StatCard
              label={t("guardOverrideLossStreak")}
              value={String(guardOverrideStats.lossStreakOverrides)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
