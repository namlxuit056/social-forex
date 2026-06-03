"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, CalendarRange } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type RangeMode = "day" | "month" | "year" | "custom";
type BucketUnit = "day" | "month" | "year";
type ChartMetric = "money" | "percent";

export interface JournalChartTrade {
  id: string;
  result: string;
  pnl: number | null;
  openedAt: string;
  closedAt: string | null;
}

interface Bucket {
  key: string;
  label: string;
  pnl: number;
  trades: number;
  wins: number;
  losses: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SVG_WIDTH = 960;
const SVG_HEIGHT = 260;
const CHART_TOP = 20;
const CHART_RIGHT = 20;
const CHART_BOTTOM = 42;
const CHART_LEFT = 46;
const CHART_HEIGHT = SVG_HEIGHT - CHART_TOP - CHART_BOTTOM;
const CHART_WIDTH = SVG_WIDTH - CHART_LEFT - CHART_RIGHT;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addUnit(date: Date, unit: BucketUnit, amount: number) {
  const next = new Date(date);
  if (unit === "day") next.setDate(next.getDate() + amount);
  if (unit === "month") next.setMonth(next.getMonth() + amount);
  if (unit === "year") next.setFullYear(next.getFullYear() + amount);
  return next;
}

function bucketKey(date: Date, unit: BucketUnit) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  if (unit === "day") return `${year}-${month}-${day}`;
  if (unit === "month") return `${year}-${month}`;
  return String(year);
}

function bucketLabel(date: Date, unit: BucketUnit, locale: string) {
  if (unit === "day") {
    return date.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
  }
  if (unit === "month") {
    return date.toLocaleDateString(locale, { month: "short", year: "2-digit" });
  }
  return date.toLocaleDateString(locale, { year: "numeric" });
}

function formatCurrency(value: number) {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

function formatPercent(value: number) {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

function rangeForMode(mode: RangeMode, customFrom: string, customTo: string) {
  const today = startOfDay(new Date());
  if (mode === "day") {
    const to = today;
    const from = new Date(to);
    from.setDate(from.getDate() - 29);
    return { from, to, unit: "day" as BucketUnit };
  }

  if (mode === "month") {
    const from = new Date(today.getFullYear(), 0, 1);
    const to = new Date(today.getFullYear(), 11, 31);
    return { from, to, unit: "month" as BucketUnit };
  }

  if (mode === "year") {
    const from = new Date(today.getFullYear() - 4, 0, 1);
    const to = new Date(today.getFullYear(), 11, 31);
    return { from, to, unit: "year" as BucketUnit };
  }

  const from = customFrom ? startOfDay(new Date(`${customFrom}T00:00:00`)) : today;
  const to = customTo ? startOfDay(new Date(`${customTo}T00:00:00`)) : today;
  const start = from <= to ? from : to;
  const end = from <= to ? to : from;
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1);
  const unit: BucketUnit = days <= 45 ? "day" : days <= 730 ? "month" : "year";
  return { from: start, to: end, unit };
}

function buildBuckets(
  trades: JournalChartTrade[],
  locale: string,
  mode: RangeMode,
  customFrom: string,
  customTo: string,
) {
  const { from, to, unit } = rangeForMode(mode, customFrom, customTo);
  const map = new Map<string, Bucket>();

  for (let cursor = new Date(from); cursor <= to; cursor = addUnit(cursor, unit, 1)) {
    const key = bucketKey(cursor, unit);
    map.set(key, {
      key,
      label: bucketLabel(cursor, unit, locale),
      pnl: 0,
      trades: 0,
      wins: 0,
      losses: 0,
    });
  }

  for (const trade of trades) {
    if (trade.result === "PENDING") continue;
    const date = startOfDay(new Date(trade.closedAt ?? trade.openedAt));
    if (date < from || date > to) continue;

    const key = bucketKey(date, unit);
    const bucket = map.get(key);
    if (!bucket) continue;

    bucket.trades += 1;
    bucket.pnl += trade.pnl ?? 0;
    if (trade.result === "WIN") bucket.wins += 1;
    if (trade.result === "LOSS") bucket.losses += 1;
  }

  return Array.from(map.values());
}

function yForValue(value: number, maxAbs: number) {
  const zeroY = CHART_TOP + CHART_HEIGHT / 2;
  if (maxAbs === 0) return zeroY;
  return zeroY - (value / maxAbs) * (CHART_HEIGHT / 2);
}

export function JournalPerformanceChart({
  trades,
  locale,
  accountBalance,
}: {
  trades: JournalChartTrade[];
  locale: string;
  accountBalance?: number | null;
}) {
  const t = useTranslations("journal");
  const today = startOfDay(new Date());
  const defaultFrom = new Date(today);
  defaultFrom.setDate(defaultFrom.getDate() - 29);
  const [mode, setMode] = useState<RangeMode>("day");
  const [metric, setMetric] = useState<ChartMetric>("money");
  const [customFrom, setCustomFrom] = useState(dateInputValue(defaultFrom));
  const [customTo, setCustomTo] = useState(dateInputValue(today));
  const [accountSize, setAccountSize] = useState(
    accountBalance && accountBalance > 0 ? String(accountBalance) : "",
  );
  const accountSizeValue = Number(accountSize);
  const validAccountSize = Number.isFinite(accountSizeValue) && accountSizeValue > 0 ? accountSizeValue : null;

  const buckets = useMemo(
    () => buildBuckets(trades, locale, mode, customFrom, customTo),
    [trades, locale, mode, customFrom, customTo],
  );

  const summary = useMemo(() => {
    const totalPnl = buckets.reduce((sum, bucket) => sum + bucket.pnl, 0);
    const tradeCount = buckets.reduce((sum, bucket) => sum + bucket.trades, 0);
    const wins = buckets.reduce((sum, bucket) => sum + bucket.wins, 0);
    const losses = buckets.reduce((sum, bucket) => sum + bucket.losses, 0);
    const best = buckets.reduce<Bucket | null>(
      (current, bucket) => (!current || bucket.pnl > current.pnl ? bucket : current),
      null,
    );
    const worst = buckets.reduce<Bucket | null>(
      (current, bucket) => (!current || bucket.pnl < current.pnl ? bucket : current),
      null,
    );
    return {
      totalPnl,
      accountPercent: validAccountSize ? (totalPnl / validAccountSize) * 100 : null,
      tradeCount,
      winRate: wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0,
      best,
      worst,
    };
  }, [buckets, validAccountSize]);

  const chart = useMemo(() => {
    const values = buckets.map((bucket) =>
      metric === "percent" ? (validAccountSize ? (bucket.pnl / validAccountSize) * 100 : 0) : bucket.pnl,
    );
    const maxAbs = Math.max(metric === "percent" ? 0.1 : 1, ...values.map((value) => Math.abs(value)));
    const gap = buckets.length > 40 ? 2 : 6;
    const barWidth = Math.max(3, (CHART_WIDTH - gap * Math.max(0, buckets.length - 1)) / Math.max(1, buckets.length));
    const zeroY = yForValue(0, maxAbs);
    const labelStep = Math.max(1, Math.ceil(buckets.length / 8));
    return { maxAbs, gap, barWidth, zeroY, labelStep, values };
  }, [buckets, metric, validAccountSize]);

  const modes: { key: RangeMode; label: string }[] = [
    { key: "day", label: t("chartDay") },
    { key: "month", label: t("chartMonth") },
    { key: "year", label: t("chartYear") },
    { key: "custom", label: t("chartCustom") },
  ];

  return (
    <Card className="border-border/60">
      <CardHeader className="gap-4 pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="size-4 text-chart-3" />
            {t("performanceChart")}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1">
              {modes.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setMode(item.key)}
                  className={cn(
                    "inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors",
                    mode === item.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 bg-background text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex rounded-md border border-border/60 p-0.5">
              {(["money", "percent"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMetric(item)}
                  className={cn(
                    "inline-flex h-7 min-w-9 items-center justify-center rounded-sm px-2 text-xs font-medium transition-colors",
                    metric === item
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item === "money" ? "$" : "%"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:max-w-3xl lg:grid-cols-3">
          {mode === "custom" && (
            <>
              <div>
                <Label className="text-xs text-muted-foreground">{t("chartFrom")}</Label>
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(event) => setCustomFrom(event.target.value)}
                  className="mt-1.5 h-9"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t("chartTo")}</Label>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(event) => setCustomTo(event.target.value)}
                  className="mt-1.5 h-9"
                />
              </div>
            </>
          )}
          <div>
            <Label className="text-xs text-muted-foreground">{t("chartAccountSize")}</Label>
            <Input
              type="number"
              min="0"
              step="any"
              value={accountSize}
              onChange={(event) => setAccountSize(event.target.value)}
              placeholder="1000"
              className="mt-1.5 h-9 font-mono"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-md border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">{t("chartNetPnl")}</p>
            <p className={cn("mt-1 font-mono text-lg font-semibold", summary.totalPnl >= 0 ? "text-emerald-500" : "text-red-500")}>
              {formatCurrency(summary.totalPnl)}
            </p>
          </div>
          <div className="rounded-md border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">{t("chartAccountPercent")}</p>
            <p
              className={cn(
                "mt-1 font-mono text-lg font-semibold",
                summary.accountPercent == null
                  ? "text-muted-foreground"
                  : summary.accountPercent >= 0
                    ? "text-emerald-500"
                    : "text-red-500",
              )}
            >
              {summary.accountPercent == null ? "—" : formatPercent(summary.accountPercent)}
            </p>
          </div>
          <div className="rounded-md border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">{t("chartTrades")}</p>
            <p className="mt-1 font-mono text-lg font-semibold text-foreground">{summary.tradeCount}</p>
          </div>
          <div className="rounded-md border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">{t("chartWinRate")}</p>
            <p className="mt-1 font-mono text-lg font-semibold text-foreground">{summary.winRate}%</p>
          </div>
          <div className="rounded-md border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">{t("chartBestWorst")}</p>
            <p className="mt-1 truncate font-mono text-sm text-foreground">
              {summary.best && summary.worst
                ? `${summary.best.label} ${formatCurrency(summary.best.pnl)} / ${summary.worst.label} ${formatCurrency(summary.worst.pnl)}`
                : "—"}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            role="img"
            aria-label={t("performanceChart")}
            className="h-72 min-w-180 w-full"
          >
            <line
              x1={CHART_LEFT}
              x2={SVG_WIDTH - CHART_RIGHT}
              y1={chart.zeroY}
              y2={chart.zeroY}
              className="stroke-border"
              strokeWidth="1"
            />
            <line
              x1={CHART_LEFT}
              x2={SVG_WIDTH - CHART_RIGHT}
              y1={CHART_TOP}
              y2={CHART_TOP}
              className="stroke-border/60"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <line
              x1={CHART_LEFT}
              x2={SVG_WIDTH - CHART_RIGHT}
              y1={SVG_HEIGHT - CHART_BOTTOM}
              y2={SVG_HEIGHT - CHART_BOTTOM}
              className="stroke-border/60"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text x="0" y={CHART_TOP + 4} className="fill-muted-foreground text-[11px]">
              {metric === "percent" ? formatPercent(chart.maxAbs) : formatCurrency(chart.maxAbs)}
            </text>
            <text x="0" y={chart.zeroY + 4} className="fill-muted-foreground text-[11px]">
              {metric === "percent" ? "0%" : "$0"}
            </text>
            <text x="0" y={SVG_HEIGHT - CHART_BOTTOM + 4} className="fill-muted-foreground text-[11px]">
              {metric === "percent" ? formatPercent(-chart.maxAbs) : formatCurrency(-chart.maxAbs)}
            </text>

            {buckets.map((bucket, index) => {
              const x = CHART_LEFT + index * (chart.barWidth + chart.gap);
              const value = chart.values[index] ?? 0;
              const y = yForValue(value, chart.maxAbs);
              const height = Math.max(1, Math.abs(chart.zeroY - y));
              const top = value >= 0 ? y : chart.zeroY;
              const showLabel = index % chart.labelStep === 0 || index === buckets.length - 1;
              return (
                <g key={bucket.key}>
                  <rect
                    x={x}
                    y={top}
                    width={chart.barWidth}
                    height={height}
                    rx="3"
                    className={value >= 0 ? "fill-emerald-500/75" : "fill-red-500/75"}
                  >
                    <title>
                      {`${bucket.label}: ${
                        metric === "percent" ? formatPercent(value) : formatCurrency(bucket.pnl)
                      } • ${bucket.trades}`}
                    </title>
                  </rect>
                  {showLabel && (
                    <text
                      x={x + chart.barWidth / 2}
                      y={SVG_HEIGHT - 14}
                      textAnchor="middle"
                      className="fill-muted-foreground text-[10px]"
                    >
                      {bucket.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {summary.tradeCount === 0 && (
          <div className="flex items-center gap-2 rounded-md border border-dashed border-border/70 px-3 py-2 text-sm text-muted-foreground">
            <CalendarRange className="size-4" />
            {t("chartEmpty")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
