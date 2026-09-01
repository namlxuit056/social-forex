"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, FileText } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  computeAdvancedStats,
  computeDrawdownSeries,
  type AdvancedStatsTrade,
  type DrawdownPoint,
} from "@/lib/journal/advanced-stats";
import {
  computeRMultipleDistribution,
  type RDistribution,
} from "@/lib/journal/r-distribution";
import { computeExcursionStats, type ExcursionTrade } from "@/lib/journal/excursion-stats";
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
import type { DisciplineScorecard, RuleId } from "@/lib/journal/discipline-scorecard";
import type { MistakeStats } from "@/lib/journal/mistake-stats";
import type { TiltDay, TiltDaysResult, TiltSignal } from "@/lib/journal/tilt-days";
import { useMistakeLabels } from "./use-setup-labels";
import { JournalGoalTracker, type TradingGoalData } from "@/components/journal/journal-goal-tracker";

export type AdvancedStatsPageTrade = AdvancedStatsTrade &
  DisciplineTrade &
  SessionTimeTrade &
  SymbolTrade &
  ExcursionTrade;

const MIN_CLOSED_TRADES = 5;
const MIN_CLOSED_TRADES_MISTAKES = 3;

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

function RDistributionChart({ dist }: { dist: RDistribution }) {
  const t = useTranslations("journal");
  const width = 320;
  const height = 170;
  const bottomPad = 26;
  const topPad = 14;
  const max = Math.max(1, ...dist.buckets.map((b) => b.count));
  const barGap = 10;
  const barWidth = Math.max(8, width / dist.buckets.length - barGap);

  if (dist.total === 0) {
    return <p className="py-8 text-center text-xs text-muted-foreground">{t("rDistEmpty")}</p>;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={0}
          x2={width}
          y1={height - bottomPad - f * (height - bottomPad - topPad)}
          y2={height - bottomPad - f * (height - bottomPad - topPad)}
          className="stroke-border/40"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      ))}
      {dist.buckets.map((b, i) => {
        const barHeight = (b.count / max) * (height - bottomPad - topPad);
        const x = i * (barWidth + barGap) + barGap / 2;
        const y = height - bottomPad - barHeight;
        return (
          <g key={b.key}>
            {b.count > 0 && (
              <text
                x={x + barWidth / 2}
                y={y - 4}
                textAnchor="middle"
                className="fill-foreground text-[10px] font-medium"
              >
                {b.count}
              </text>
            )}
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(1, barHeight)}
              rx="2"
              className={b.win ? "fill-emerald-500/70" : "fill-red-500/70"}
            />
            <text
              x={x + barWidth / 2}
              y={height - 9}
              textAnchor="middle"
              className="fill-muted-foreground text-[8px]"
            >
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DrawdownChart({ points, locale }: { points: DrawdownPoint[]; locale: string }) {
  const t = useTranslations("journal");
  const width = 320;
  const height = 170;
  const pad = 22;

  if (points.length < 2) {
    return <p className="py-8 text-center text-xs text-muted-foreground">{t("drawdownEmpty")}</p>;
  }

  const minDd = Math.min(0, ...points.map((p) => p.drawdown));
  const range = Math.abs(minDd) || 1;
  const n = points.length;
  const topY = 12;
  const xAt = (i: number) => pad + (i / (n - 1)) * (width - pad * 2);
  const yAt = (dd: number) => topY + (Math.abs(dd) / range) * (height - pad - topY);

  const line = points.map((p, i) => `${xAt(i)},${yAt(p.drawdown)}`).join(" ");
  const area = `${pad},${yAt(0)} ${line} ${xAt(n - 1)},${yAt(0)}`;

  const trough = points.reduce((a, b) => (b.drawdown < a.drawdown ? b : a), points[0]);
  const troughIdx = points.indexOf(trough);

  return (
    <div className="space-y-1">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full">
        <line
          x1={pad}
          x2={width - pad}
          y1={yAt(0)}
          y2={yAt(0)}
          className="stroke-border"
          strokeWidth="1"
        />
        <polygon points={area} className="fill-red-500/15" />
        <polyline
          points={line}
          fill="none"
          className="stroke-red-500"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {trough.drawdown < 0 && (
          <>
            <circle cx={xAt(troughIdx)} cy={yAt(trough.drawdown)} r="2.5" className="fill-red-500" />
            <text
              x={Math.min(width - pad, Math.max(pad, xAt(troughIdx)))}
              y={yAt(trough.drawdown) + 12}
              textAnchor="middle"
              className="fill-red-500 text-[9px] font-medium"
            >
              {fmtMoney(trough.drawdown)}
            </text>
          </>
        )}
      </svg>
      <p className="text-center text-[10px] text-muted-foreground">
        {t("drawdownAxisNote", {
          from: new Date(points[0].closedAt).toLocaleDateString(locale, { day: "2-digit", month: "2-digit" }),
          to: new Date(points[n - 1].closedAt).toLocaleDateString(locale, { day: "2-digit", month: "2-digit" }),
        })}
      </p>
    </div>
  );
}

const SCORECARD_RULE_KEY: Record<RuleId, string> = {
  hasStopLoss: "scorecardRuleHasStopLoss",
  riskWithinLimit: "scorecardRuleRiskWithinLimit",
  withinDailyLimit: "scorecardRuleWithinDailyLimit",
  noRevengeOverride: "scorecardRuleNoRevengeOverride",
  checklistComplete: "scorecardRuleChecklistComplete",
  positiveMood: "scorecardRulePositiveMood",
  onPlaybook: "scorecardRuleOnPlaybook",
};

function DisciplineScorecardCard({ scorecard }: { scorecard: DisciplineScorecard }) {
  const t = useTranslations("journal");
  const score = scorecard.overallScore;
  if (score === null || scorecard.sampleSize < MIN_CLOSED_TRADES) return null;

  const scoreColor =
    score >= 80 ? "text-emerald-500" : score >= 60 ? "text-amber-500" : "text-red-500";

  const top =
    scorecard.topLever !== null
      ? scorecard.rules.find((r) => r.id === scorecard.topLever) ?? null
      : null;

  // Xếp quy tắc có xếp hạng + gap lớn nhất lên đầu; phần còn lại giữ thứ tự khai báo
  // (Array.prototype.sort ổn định).
  const ordered = [...scorecard.rules].sort((a, b) => {
    const aG = a.ranked && a.winRateGap !== null ? a.winRateGap : -Infinity;
    const bG = b.ranked && b.winRateGap !== null ? b.winRateGap : -Infinity;
    return bG - aG;
  });

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t("scorecardTitle")}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {t("scorecardNote", { n: scorecard.sampleSize })}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className={cn("font-mono text-3xl font-bold tabular-nums", scoreColor)}>
            {score}
          </span>
          <span className="text-sm text-muted-foreground">/ 100</span>
        </div>

        {top && top.winRateGap !== null ? (
          <p
            className={cn(
              "text-xs",
              score >= 80
                ? "text-emerald-600 dark:text-emerald-500"
                : "text-amber-600 dark:text-amber-500",
            )}
          >
            {t("scorecardTopLever", {
              rule: t(SCORECARD_RULE_KEY[top.id]),
              followed: top.followedWinRate ?? 0,
              violated: top.violatedWinRate ?? 0,
              gap: `+${top.winRateGap}`,
            })}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">{t("scorecardNoLever")}</p>
        )}

        <div className="space-y-1.5">
          {ordered.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="w-44 shrink-0 truncate text-foreground">
                {t(SCORECARD_RULE_KEY[r.id])}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="block h-1.5 w-14 overflow-hidden rounded bg-muted">
                  <span
                    className="block h-full rounded bg-foreground/50"
                    style={{ width: `${r.followedPct ?? 0}%` }}
                  />
                </span>
                <span className="w-9 text-right font-mono text-muted-foreground">
                  {r.followedPct !== null ? `${Math.round(r.followedPct)}%` : "—"}
                </span>
              </span>
              {r.ranked && r.winRateGap !== null ? (
                <span className="ml-auto flex items-center gap-2 font-mono">
                  <span className="text-muted-foreground">
                    {r.followedWinRate}% ✓ / {r.violatedWinRate}% ✗
                  </span>
                  <span
                    className={cn(
                      "rounded px-1 py-0.5 tabular-nums",
                      r.winRateGap > 0
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500"
                        : "bg-red-500/10 text-red-600 dark:text-red-500",
                    )}
                  >
                    {r.winRateGap > 0 ? "+" : ""}
                    {r.winRateGap}
                    {t("scorecardGapUnit")}
                  </span>
                </span>
              ) : (
                <span className="ml-auto text-muted-foreground/60">{t("scorecardNotEnough")}</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MistakeCostCard({ stats }: { stats: MistakeStats }) {
  const t = useTranslations("journal");
  const labels = useMistakeLabels();
  if (stats.taggedTrades < MIN_CLOSED_TRADES_MISTAKES) return null;

  const worst = stats.rows[0];
  const maxAbs = Math.max(1, ...stats.rows.map((r) => Math.abs(r.totalPnl)));

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t("mistakeCostTitle")}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {t("mistakeCostNote", { n: stats.taggedTrades })}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {worst && worst.totalPnl < 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-500">
            {t("mistakeCostInsight", {
              mistake: labels[worst.tag],
              count: worst.count,
              total: fmtMoney(worst.totalPnl),
              avg: worst.avgPnl !== null ? fmtMoney(worst.avgPnl) : "—",
            })}
          </p>
        )}

        <div className="space-y-1.5">
          {stats.rows.map((r) => (
            <div key={r.tag} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="w-44 shrink-0 truncate text-foreground">{labels[r.tag]}</span>
              <span className="w-16 shrink-0 text-right font-mono text-muted-foreground">
                {t("mistakeCostCount", { count: r.count })}
              </span>
              <span
                className={cn(
                  "w-14 shrink-0 text-right font-mono",
                  r.winRate === null
                    ? "text-muted-foreground/50"
                    : r.winRate >= 50
                      ? "text-emerald-500"
                      : "text-red-500",
                )}
              >
                {r.winRate !== null ? `${r.winRate}%` : "—"}
              </span>
              <span className="flex flex-1 items-center justify-end gap-2">
                <span className="hidden h-1.5 w-24 overflow-hidden rounded bg-muted sm:block">
                  <span
                    className={cn(
                      "block h-full rounded",
                      r.totalPnl >= 0 ? "bg-emerald-500/60" : "bg-red-500/60",
                    )}
                    style={{ width: `${(Math.abs(r.totalPnl) / maxAbs) * 100}%` }}
                  />
                </span>
                <span
                  className={cn(
                    "w-20 text-right font-mono font-medium",
                    r.totalPnl >= 0 ? "text-emerald-500" : "text-red-500",
                  )}
                >
                  {fmtMoney(r.totalPnl)}
                </span>
              </span>
            </div>
          ))}
        </div>

        {stats.withMistakeWinRate !== null && stats.withoutMistakeWinRate !== null && (
          <p className="text-xs text-muted-foreground">
            {t("mistakeCostCompare", {
              withRate: stats.withMistakeWinRate,
              withoutRate: stats.withoutMistakeWinRate,
            })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const MIN_TILT_TRADING_DAYS = 5;

function TiltDaysCard({ result, locale }: { result: TiltDaysResult; locale: string }) {
  const t = useTranslations("journal");
  if (result.tiltDays.length === 0 || result.tradingDays < MIN_TILT_TRADING_DAYS) return null;

  function signalLabel(sig: TiltSignal, day: TiltDay): string {
    switch (sig) {
      case "lossStreak":
        return t("tiltSignalLossStreak", { count: day.lossStreak });
      case "sizeEscalation":
        return t("tiltSignalSizeEscalation");
      case "overtrading":
        return t("tiltSignalOvertrading", { count: day.tradeCount });
      case "guardOverride":
        return t("tiltSignalGuardOverride");
      case "revenge":
        return t("tiltSignalRevenge");
      case "deepLoss":
        return t("tiltSignalDeepLoss", { r: day.netR ?? 0 });
    }
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t("tiltTitle")}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {t("tiltNote", { count: result.tiltDays.length, total: result.tradingDays })}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {result.tiltWinRate !== null && result.normalWinRate !== null && (
          <p className="text-xs text-amber-600 dark:text-amber-500">
            {t("tiltPayoff", {
              tiltPnl: fmtMoney(result.tiltNetPnl),
              tiltRate: result.tiltWinRate,
              normalPnl: fmtMoney(result.normalNetPnl),
              normalRate: result.normalWinRate,
            })}
          </p>
        )}

        <div className="space-y-2">
          {result.tiltDays.slice(0, 10).map((day) => (
            <details key={day.day} className="rounded-lg border border-border/60 px-3 py-2">
              <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="font-medium text-foreground">
                  {new Date(`${day.day}T00:00:00Z`).toLocaleDateString(locale, {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                  })}
                </span>
                <span className="text-muted-foreground">
                  {t("mistakeCostCount", { count: day.tradeCount })}
                </span>
                <span
                  className={cn(
                    "font-mono font-medium",
                    day.netPnl >= 0 ? "text-emerald-500" : "text-red-500",
                  )}
                >
                  {fmtMoney(day.netPnl)}
                </span>
                <span className="flex flex-wrap gap-1">
                  {day.signals.map((sig) => (
                    <span
                      key={sig}
                      className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-600 dark:text-amber-500"
                    >
                      {signalLabel(sig, day)}
                    </span>
                  ))}
                </span>
              </summary>
              <div className="mt-2 space-y-1 border-t border-border/40 pt-2">
                {day.trades.map((tr, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 font-mono text-[11px] text-muted-foreground"
                  >
                    <span className="text-foreground">{tr.symbol}</span>
                    <span
                      className={cn(
                        tr.result === "WIN"
                          ? "text-emerald-500"
                          : tr.result === "LOSS"
                            ? "text-red-500"
                            : "text-muted-foreground",
                      )}
                    >
                      {tr.result}
                    </span>
                    <span>{tr.lotSize ?? "—"}</span>
                    <span
                      className={cn(
                        (tr.pnl ?? 0) >= 0 ? "text-emerald-500" : "text-red-500",
                      )}
                    >
                      {tr.pnl !== null ? fmtMoney(tr.pnl) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
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
  scorecard,
  mistakeStats,
  tiltDays,
  tradingGoal,
}: {
  trades: AdvancedStatsPageTrade[];
  locale: string;
  accountBalance: number | null;
  planCompliance?: PlanComplianceStats;
  checklistCompliance?: ChecklistComplianceStats;
  emotionCorrelation?: EmotionDiaryCorrelationStats;
  guardOverrideStats?: GuardOverrideStats;
  scorecard?: DisciplineScorecard;
  mistakeStats?: MistakeStats;
  tiltDays?: TiltDaysResult;
  tradingGoal?: TradingGoalData | null;
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
  const rDistribution = useMemo(() => computeRMultipleDistribution(trades), [trades]);
  const drawdownSeries = useMemo(() => computeDrawdownSeries(trades), [trades]);
  const excursion = useMemo(() => computeExcursionStats(trades), [trades]);
  const dayOfWeekStats = useMemo(
    () => computeDayOfWeekStats(trades, timeWindowTz === "vn" ? VN_UTC_OFFSET_HOURS : 0),
    [trades, timeWindowTz],
  );

  const goalTracker = (
    <JournalGoalTracker goal={tradingGoal ?? null} trades={trades} locale={locale} />
  );

  if (stats.closedTrades < MIN_CLOSED_TRADES) {
    return (
      <div className="space-y-6">
        {goalTracker}
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center">
          <BarChart3 className="size-10 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            {t("edgeEmpty", { min: MIN_CLOSED_TRADES })}
          </p>
        </div>
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
      {goalTracker}

      {scorecard && <DisciplineScorecardCard scorecard={scorecard} />}

      {mistakeStats && <MistakeCostCard stats={mistakeStats} />}

      {tiltDays && <TiltDaysCard result={tiltDays} locale={locale} />}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-lg font-semibold">{t("statsAdvancedTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("statsAdvancedDesc")}</p>
        </div>
        <Link
          href="/journal/report"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
        >
          <FileText className="size-3.5" />
          {t("reportExport")}
        </Link>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("rDistTitle")}</CardTitle>
            <p className="text-xs text-muted-foreground">{t("rDistNote")}</p>
          </CardHeader>
          <CardContent>
            <RDistributionChart dist={rDistribution} />
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("drawdownTitle")}</CardTitle>
            <p className="text-xs text-muted-foreground">{t("drawdownNote")}</p>
          </CardHeader>
          <CardContent>
            <DrawdownChart points={drawdownSeries} locale={locale} />
          </CardContent>
        </Card>
      </div>

      {excursion.sampleSize >= 3 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("excursionTitle")}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {t("excursionNote", { n: excursion.sampleSize })}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard
                label={t("excursionCapture")}
                value={
                  excursion.avgMfeCapturePct !== null
                    ? `${Math.round(excursion.avgMfeCapturePct * 100)}%`
                    : "—"
                }
                sub={t("excursionCaptureHint")}
                tone={
                  excursion.avgMfeCapturePct === null
                    ? "neutral"
                    : excursion.avgMfeCapturePct >= 0.6
                      ? "positive"
                      : excursion.avgMfeCapturePct < 0.4
                        ? "negative"
                        : "neutral"
                }
              />
              <StatCard
                label={t("excursionHeat")}
                value={
                  excursion.avgHeatOnWinners !== null
                    ? fmtMoney(excursion.avgHeatOnWinners)
                    : "—"
                }
              />
              <StatCard
                label={t("excursionGiveBack")}
                value={
                  excursion.avgGiveBackOnLosers !== null
                    ? t("excursionGiveBackValue", {
                        count: excursion.giveBackCount,
                        amount: fmtMoney(excursion.avgGiveBackOnLosers),
                      })
                    : "—"
                }
                tone={excursion.giveBackCount > 0 ? "negative" : "neutral"}
              />
            </div>
            {excursion.avgMfeCapturePct !== null && excursion.avgMfeCapturePct < 0.5 && (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                {t("excursionInsightEarly", {
                  pct: Math.round(excursion.avgMfeCapturePct * 100),
                })}
              </p>
            )}
            {excursion.giveBackCount >= 2 && excursion.avgGiveBackOnLosers !== null && (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                {t("excursionInsightGiveBack", {
                  count: excursion.giveBackCount,
                  amount: fmtMoney(excursion.avgGiveBackOnLosers),
                })}
              </p>
            )}
          </CardContent>
        </Card>
      )}

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
