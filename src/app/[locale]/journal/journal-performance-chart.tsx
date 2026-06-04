"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, TrendingUp, CalendarRange, Activity, Flame, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type RangeMode = "day" | "month" | "year" | "custom";
type BucketUnit = "day" | "month" | "year";
type ChartMetric = "money" | "percent";
type ChartType = "bars" | "equity";

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

interface EquityPoint {
  date: Date;
  cumPnl: number;
  tradePnl: number;
  label: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SVG_WIDTH = 960;
const SVG_HEIGHT = 280;
const CHART_TOP = 30;
const CHART_RIGHT = 24;
const CHART_BOTTOM = 46;
const CHART_LEFT = 62;
const CHART_HEIGHT = SVG_HEIGHT - CHART_TOP - CHART_BOTTOM;
const CHART_WIDTH = SVG_WIDTH - CHART_LEFT - CHART_RIGHT;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addUnit(date: Date, unit: BucketUnit, amount: number) {
  const next = new Date(date);
  if (unit === "day") next.setDate(next.getDate() + amount);
  if (unit === "month") next.setMonth(next.getMonth() + amount);
  if (unit === "year") next.setFullYear(next.getFullYear() + amount);
  return next;
}

function bucketKey(date: Date, unit: BucketUnit) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  if (unit === "day") return `${y}-${m}-${d}`;
  if (unit === "month") return `${y}-${m}`;
  return String(y);
}

function bucketLabel(date: Date, unit: BucketUnit, locale: string) {
  if (unit === "day")
    return date.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
  if (unit === "month")
    return date.toLocaleDateString(locale, { month: "short", year: "2-digit" });
  return date.toLocaleDateString(locale, { year: "numeric" });
}

function fmtCurrency(v: number) {
  const sign = v >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(v).toFixed(2)}`;
}

function fmtPercent(v: number) {
  const sign = v >= 0 ? "+" : "-";
  return `${sign}${Math.abs(v).toFixed(2)}%`;
}

function rangeForMode(mode: RangeMode, from: string, to: string) {
  const today = startOfDay(new Date());
  if (mode === "day") {
    const end = today;
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    return { from: start, to: end, unit: "day" as BucketUnit };
  }
  if (mode === "month") {
    return {
      from: new Date(today.getFullYear(), 0, 1),
      to: new Date(today.getFullYear(), 11, 31),
      unit: "month" as BucketUnit,
    };
  }
  if (mode === "year") {
    return {
      from: new Date(today.getFullYear() - 4, 0, 1),
      to: new Date(today.getFullYear(), 11, 31),
      unit: "year" as BucketUnit,
    };
  }
  const f = from ? startOfDay(new Date(`${from}T00:00:00`)) : today;
  const t = to ? startOfDay(new Date(`${to}T00:00:00`)) : today;
  const s = f <= t ? f : t;
  const e = f <= t ? t : f;
  const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / MS_PER_DAY) + 1);
  const unit: BucketUnit = days <= 45 ? "day" : days <= 730 ? "month" : "year";
  return { from: s, to: e, unit };
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
  for (let c = new Date(from); c <= to; c = addUnit(c, unit, 1)) {
    const key = bucketKey(c, unit);
    map.set(key, { key, label: bucketLabel(c, unit, locale), pnl: 0, trades: 0, wins: 0, losses: 0 });
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

function buildEquityPoints(
  trades: JournalChartTrade[],
  locale: string,
  mode: RangeMode,
  customFrom: string,
  customTo: string,
): EquityPoint[] {
  const { from, to } = rangeForMode(mode, customFrom, customTo);
  const sorted = trades
    .filter((t) => t.result !== "PENDING" && t.closedAt)
    .filter((t) => {
      const d = new Date(t.closedAt!);
      return d >= from && d <= to;
    })
    .sort((a, b) => new Date(a.closedAt!).getTime() - new Date(b.closedAt!).getTime());

  let cum = 0;
  const points: EquityPoint[] = [
    { date: from, cumPnl: 0, tradePnl: 0, label: bucketLabel(from, "day", locale) },
  ];
  for (const trade of sorted) {
    cum += trade.pnl ?? 0;
    const date = new Date(trade.closedAt!);
    points.push({
      date,
      cumPnl: cum,
      tradePnl: trade.pnl ?? 0,
      label: date.toLocaleDateString(locale, { month: "short", day: "numeric" }),
    });
  }
  return points;
}

function yForValue(value: number, maxAbs: number) {
  const zeroY = CHART_TOP + CHART_HEIGHT / 2;
  if (maxAbs === 0) return zeroY;
  return zeroY - (value / maxAbs) * (CHART_HEIGHT / 2);
}

function axisLabels(maxAbs: number) {
  return [maxAbs, maxAbs / 2, 0, -maxAbs / 2, -maxAbs].map((v) => ({
    value: v,
    y: yForValue(v, maxAbs),
  }));
}

// Compute current streak from all trades (not range-filtered), skipping BREAKEVEN
function computeStreak(trades: JournalChartTrade[]): { count: number; type: "WIN" | "LOSS" | null } {
  const wl = trades
    .filter((t) => (t.result === "WIN" || t.result === "LOSS") && t.closedAt)
    .sort((a, b) => new Date(b.closedAt!).getTime() - new Date(a.closedAt!).getTime());

  if (wl.length === 0) return { count: 0, type: null };

  const type = wl[0].result as "WIN" | "LOSS";
  let count = 0;
  for (const t of wl) {
    if (t.result === type) count++;
    else break;
  }
  return { count, type };
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
  const [chartType, setChartType] = useState<ChartType>("bars");
  const [customFrom, setCustomFrom] = useState(dateInputValue(defaultFrom));
  const [customTo, setCustomTo] = useState(dateInputValue(today));
  const [accountSize, setAccountSize] = useState(
    accountBalance && accountBalance > 0 ? String(accountBalance) : "",
  );
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const accountSizeValue = Number(accountSize);
  const validAccountSize =
    Number.isFinite(accountSizeValue) && accountSizeValue > 0 ? accountSizeValue : null;

  const buckets = useMemo(
    () => buildBuckets(trades, locale, mode, customFrom, customTo),
    [trades, locale, mode, customFrom, customTo],
  );

  const equityPoints = useMemo(
    () => buildEquityPoints(trades, locale, mode, customFrom, customTo),
    [trades, locale, mode, customFrom, customTo],
  );

  // Streak is computed from ALL trades regardless of date range
  const streak = useMemo(() => computeStreak(trades), [trades]);

  const summary = useMemo(() => {
    const totalPnl = buckets.reduce((sum, b) => sum + b.pnl, 0);
    const tradeCount = buckets.reduce((sum, b) => sum + b.trades, 0);
    const wins = buckets.reduce((sum, b) => sum + b.wins, 0);
    const losses = buckets.reduce((sum, b) => sum + b.losses, 0);
    const grossWin = trades
      .filter((t) => t.result === "WIN")
      .reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    const grossLoss = Math.abs(
      trades
        .filter((t) => t.result === "LOSS")
        .reduce((sum, t) => sum + (t.pnl ?? 0), 0),
    );
    const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;
    const best = buckets.reduce<Bucket | null>((c, b) => (!c || b.pnl > c.pnl ? b : c), null);
    const worst = buckets.reduce<Bucket | null>((c, b) => (!c || b.pnl < c.pnl ? b : c), null);
    return {
      totalPnl,
      accountPercent: validAccountSize ? (totalPnl / validAccountSize) * 100 : null,
      tradeCount,
      wins,
      losses,
      winRate: wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0,
      profitFactor,
      best,
      worst,
    };
  }, [buckets, trades, validAccountSize]);

  // Max drawdown from equity curve in current range
  const maxDrawdown = useMemo(() => {
    if (equityPoints.length < 2) return null;
    let peak = 0;
    let maxDD = 0;
    for (const pt of equityPoints) {
      if (pt.cumPnl > peak) peak = pt.cumPnl;
      const dd = pt.cumPnl - peak;
      if (dd < maxDD) maxDD = dd;
    }
    return maxDD; // always <= 0
  }, [equityPoints]);

  const barsChart = useMemo(() => {
    const values = buckets.map((b) =>
      metric === "percent" ? (validAccountSize ? (b.pnl / validAccountSize) * 100 : 0) : b.pnl,
    );
    const maxAbs = Math.max(
      metric === "percent" ? 0.1 : 1,
      ...values.map((v) => Math.abs(v)),
    );
    const gap = buckets.length > 40 ? 2 : 6;
    const barWidth = Math.max(
      3,
      (CHART_WIDTH - gap * Math.max(0, buckets.length - 1)) / Math.max(1, buckets.length),
    );
    const zeroY = yForValue(0, maxAbs);
    const labelStep = Math.max(1, Math.ceil(buckets.length / 8));
    return { maxAbs, gap, barWidth, zeroY, labelStep, values, axes: axisLabels(maxAbs) };
  }, [buckets, metric, validAccountSize]);

  const equityChart = useMemo(() => {
    if (equityPoints.length < 2) return null;
    const values = equityPoints.map((p) =>
      metric === "percent"
        ? validAccountSize
          ? (p.cumPnl / validAccountSize) * 100
          : 0
        : p.cumPnl,
    );
    const maxAbs = Math.max(
      metric === "percent" ? 0.1 : 1,
      ...values.map((v) => Math.abs(v)),
    );
    const zeroY = yForValue(0, maxAbs);
    const totalRange =
      equityPoints[equityPoints.length - 1].date.getTime() -
      equityPoints[0].date.getTime();
    const xForIdx = (i: number) => {
      if (totalRange === 0)
        return CHART_LEFT + (i / Math.max(1, equityPoints.length - 1)) * CHART_WIDTH;
      const frac =
        (equityPoints[i].date.getTime() - equityPoints[0].date.getTime()) / totalRange;
      return CHART_LEFT + frac * CHART_WIDTH;
    };
    const pts = equityPoints.map((_, i) => ({
      x: xForIdx(i),
      y: yForValue(values[i] ?? 0, maxAbs),
    }));
    const linePath = pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ");
    const bottom = SVG_HEIGHT - CHART_BOTTOM;
    const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${bottom} L${pts[0].x.toFixed(1)},${bottom} Z`;
    const labelStep = Math.max(1, Math.ceil(equityPoints.length / 8));

    // Running peak for drawdown visualization
    let peak = values[0] ?? 0;
    const runningPeaks: number[] = [];
    for (const v of values) {
      if (v > peak) peak = v;
      runningPeaks.push(peak);
    }

    // Drawdown area path: top edge = running peak, bottom edge = equity line
    const ddPeakPath = pts
      .map((pt, i) => {
        const py = yForValue(runningPeaks[i] ?? 0, maxAbs);
        return `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${py.toFixed(1)}`;
      })
      .join(" ");
    const ddEquityReverse = [...pts]
      .reverse()
      .map((pt) => `L${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
      .join(" ");
    const ddAreaPath = `${ddPeakPath} ${ddEquityReverse} Z`;

    // Running peak line path (dashed gray)
    const peakLinePath = pts
      .map((pt, i) => {
        const py = yForValue(runningPeaks[i] ?? 0, maxAbs);
        return `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${py.toFixed(1)}`;
      })
      .join(" ");

    return {
      maxAbs,
      zeroY,
      pts,
      linePath,
      areaPath,
      ddAreaPath,
      peakLinePath,
      runningPeaks,
      values,
      axes: axisLabels(maxAbs),
      labelStep,
      positive: values[values.length - 1] >= 0,
    };
  }, [equityPoints, metric, validAccountSize]);

  const handleBarsHover = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const svgX = ((e.clientX - rect.left) / rect.width) * SVG_WIDTH;
      const x = svgX - CHART_LEFT;
      if (x < 0 || x > CHART_WIDTH) {
        setHoveredIndex(null);
        return;
      }
      const idx = Math.floor(x / (barsChart.barWidth + barsChart.gap));
      setHoveredIndex(idx >= 0 && idx < buckets.length ? idx : null);
    },
    [barsChart.barWidth, barsChart.gap, buckets.length],
  );

  const handleEquityHover = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || !equityChart) return;
      const rect = svgRef.current.getBoundingClientRect();
      const svgX = ((e.clientX - rect.left) / rect.width) * SVG_WIDTH;
      let closest = 0;
      let minDist = Infinity;
      for (let i = 0; i < equityChart.pts.length; i++) {
        const dist = Math.abs(equityChart.pts[i].x - svgX);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      }
      setHoveredIndex(closest);
    },
    [equityChart],
  );

  const modes: { key: RangeMode; label: string }[] = [
    { key: "day", label: t("chartDay") },
    { key: "month", label: t("chartMonth") },
    { key: "year", label: t("chartYear") },
    { key: "custom", label: t("chartCustom") },
  ];

  const chartTypes: { key: ChartType; label: string; Icon: React.ElementType }[] = [
    { key: "bars", label: t("chartBars"), Icon: BarChart3 },
    { key: "equity", label: t("chartEquity"), Icon: Activity },
  ];

  function renderBarsTooltip() {
    if (hoveredIndex === null) return null;
    const bucket = buckets[hoveredIndex];
    if (!bucket) return null;
    const value = barsChart.values[hoveredIndex] ?? 0;
    const barX = CHART_LEFT + hoveredIndex * (barsChart.barWidth + barsChart.gap);
    const cx = barX + barsChart.barWidth / 2;
    const tx = Math.min(Math.max(cx, CHART_LEFT + 58), SVG_WIDTH - CHART_RIGHT - 58);
    const ty = CHART_TOP - 8;
    const label1 = metric === "percent" ? fmtPercent(value) : fmtCurrency(bucket.pnl);
    const isPos = value >= 0;
    return (
      <g pointerEvents="none">
        <line
          x1={cx} x2={cx}
          y1={CHART_TOP} y2={SVG_HEIGHT - CHART_BOTTOM}
          strokeWidth="1" strokeDasharray="3 3"
          className="stroke-muted-foreground/40"
        />
        <rect x={tx - 56} y={ty - 28} width={112} height={40} rx="5" className="fill-card stroke-border" strokeWidth="1" />
        <text
          x={tx} y={ty - 12} textAnchor="middle"
          className={cn("text-[12px] font-bold", isPos ? "fill-emerald-500" : "fill-red-500")}
        >
          {label1}
        </text>
        <text x={tx} y={ty + 4} textAnchor="middle" className="fill-muted-foreground text-[10px]">
          {bucket.label} · {bucket.trades}t · {bucket.wins}W/{bucket.losses}L
        </text>
      </g>
    );
  }

  function renderEquityTooltip() {
    if (hoveredIndex === null || !equityChart) return null;
    const pt = equityChart.pts[hoveredIndex];
    const ep = equityPoints[hoveredIndex];
    if (!pt || !ep) return null;
    const value = equityChart.values[hoveredIndex] ?? 0;
    const peakVal = equityChart.runningPeaks[hoveredIndex] ?? 0;
    const ddVal = value - peakVal;
    const isPos = value >= 0;
    const label1 = metric === "percent" ? fmtPercent(value) : fmtCurrency(ep.cumPnl);
    const tx = Math.min(Math.max(pt.x, CHART_LEFT + 58), SVG_WIDTH - CHART_RIGHT - 58);
    const ty = CHART_TOP - 8;
    const showDd = ddVal < -0.001;
    const tooltipH = showDd ? 54 : 40;
    return (
      <g pointerEvents="none">
        <line
          x1={pt.x} x2={pt.x}
          y1={CHART_TOP} y2={SVG_HEIGHT - CHART_BOTTOM}
          strokeWidth="1" strokeDasharray="3 3"
          className="stroke-muted-foreground/40"
        />
        <circle cx={pt.x} cy={pt.y} r="7" className={cn("opacity-20", isPos ? "fill-emerald-500" : "fill-red-500")} />
        <circle cx={pt.x} cy={pt.y} r="4" className={cn(isPos ? "fill-emerald-500" : "fill-red-500")} />
        <circle cx={pt.x} cy={pt.y} r="2" className="fill-card" />
        <rect x={tx - 58} y={ty - 28} width={116} height={tooltipH} rx="5" className="fill-card stroke-border" strokeWidth="1" />
        <text
          x={tx} y={ty - 12} textAnchor="middle"
          className={cn("text-[12px] font-bold", isPos ? "fill-emerald-500" : "fill-red-500")}
        >
          {label1}
        </text>
        <text x={tx} y={ty + 4} textAnchor="middle" className="fill-muted-foreground text-[10px]">
          {ep.label}
          {ep.tradePnl !== 0 ? ` · ${fmtCurrency(ep.tradePnl)}` : ""}
        </text>
        {showDd && (
          <text x={tx} y={ty + 18} textAnchor="middle" className="fill-red-400 text-[10px]">
            DD {metric === "percent" && validAccountSize
              ? fmtPercent((ddVal / validAccountSize) * 100)
              : fmtCurrency(ddVal)}
          </text>
        )}
      </g>
    );
  }

  const activeAxes = chartType === "bars" ? barsChart.axes : (equityChart?.axes ?? barsChart.axes);
  const isWinStreak = streak.type === "WIN";
  const isLossStreak = streak.type === "LOSS";

  return (
    <Card className="border-border/60">
      <CardHeader className="gap-4 pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4 text-chart-3" />
            {t("performanceChart")}
          </CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            {/* Chart type toggle */}
            <div className="flex rounded-lg border border-border/60 p-0.5">
              {chartTypes.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setChartType(key);
                    setHoveredIndex(null);
                  }}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
                    chartType === key
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3" />
                  {label}
                </button>
              ))}
            </div>

            {/* Period selector */}
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

            {/* Money / % toggle */}
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

        {/* Inputs */}
        <div className="grid gap-3 sm:grid-cols-2 lg:max-w-3xl lg:grid-cols-3">
          {mode === "custom" && (
            <>
              <div>
                <Label className="text-xs text-muted-foreground">{t("chartFrom")}</Label>
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="mt-1.5 h-9"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t("chartTo")}</Label>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
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
              onChange={(e) => setAccountSize(e.target.value)}
              placeholder="1000"
              className="mt-1.5 h-9 font-mono"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Stats row — 7 cards: Net P&L / Trades / Win Rate / Streak / Profit Factor / Max DD / Best-Worst */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          {/* Net P&L */}
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("chartNetPnl")}
            </p>
            <p
              className={cn(
                "mt-1.5 font-mono text-xl font-bold tabular-nums",
                summary.totalPnl >= 0 ? "text-emerald-500" : "text-red-500",
              )}
            >
              {fmtCurrency(summary.totalPnl)}
            </p>
            {summary.accountPercent != null && (
              <p
                className={cn(
                  "mt-0.5 font-mono text-xs",
                  summary.accountPercent >= 0 ? "text-emerald-500/70" : "text-red-500/70",
                )}
              >
                {fmtPercent(summary.accountPercent)}
              </p>
            )}
          </div>

          {/* Trades */}
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("chartTrades")}
            </p>
            <p className="mt-1.5 font-mono text-xl font-bold tabular-nums text-foreground">
              {summary.tradeCount}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground/70">
              <span className="text-emerald-500/80">{summary.wins}W</span>
              {" / "}
              <span className="text-red-500/80">{summary.losses}L</span>
            </p>
          </div>

          {/* Win rate */}
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("chartWinRate")}
            </p>
            <p
              className={cn(
                "mt-1.5 font-mono text-xl font-bold tabular-nums",
                summary.winRate >= 50 ? "text-emerald-500" : "text-red-500",
              )}
            >
              {summary.winRate}%
            </p>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${summary.winRate}%` }}
              />
            </div>
          </div>

          {/* Streak — computed from ALL trades, not range-filtered */}
          <div
            className={cn(
              "rounded-lg border p-3 transition-colors",
              isWinStreak
                ? "border-emerald-500/30 bg-emerald-500/5"
                : isLossStreak
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-border/60",
            )}
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("chartStreak")}
            </p>
            {streak.count > 0 && streak.type ? (
              <div className="mt-1.5 flex items-center gap-1.5">
                {isWinStreak ? (
                  <Flame className="size-5 shrink-0 text-emerald-500" />
                ) : (
                  <TrendingDown className="size-5 shrink-0 text-red-500" />
                )}
                <span
                  className={cn(
                    "font-mono text-xl font-bold tabular-nums",
                    isWinStreak ? "text-emerald-500" : "text-red-500",
                  )}
                >
                  {streak.count}
                  {isWinStreak ? "W" : "L"}
                </span>
              </div>
            ) : (
              <p className="mt-1.5 font-mono text-xl font-bold text-muted-foreground">—</p>
            )}
            <p className="mt-0.5 text-[11px] text-muted-foreground/60">
              {isWinStreak
                ? t("chartStreakWin")
                : isLossStreak
                  ? t("chartStreakLoss")
                  : ""}
            </p>
          </div>

          {/* Profit factor */}
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("chartProfitFactor")}
            </p>
            <p
              className={cn(
                "mt-1.5 font-mono text-xl font-bold tabular-nums",
                summary.profitFactor >= 1 ? "text-emerald-500" : "text-red-500",
              )}
            >
              {summary.profitFactor === Infinity
                ? "∞"
                : summary.profitFactor === 0
                  ? "—"
                  : summary.profitFactor.toFixed(2)}
            </p>
          </div>

          {/* Max Drawdown */}
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("chartMaxDrawdown")}
            </p>
            <p
              className={cn(
                "mt-1.5 font-mono text-xl font-bold tabular-nums",
                maxDrawdown === null || maxDrawdown === 0
                  ? "text-muted-foreground"
                  : "text-red-500",
              )}
            >
              {maxDrawdown === null || maxDrawdown === 0
                ? "—"
                : metric === "percent" && validAccountSize
                  ? fmtPercent((maxDrawdown / validAccountSize) * 100)
                  : fmtCurrency(maxDrawdown)}
            </p>
          </div>

          {/* Best / Worst */}
          <div className="col-span-2 rounded-lg border border-border/60 p-3 sm:col-span-3 lg:col-span-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("chartBestWorst")}
            </p>
            {summary.best && summary.worst ? (
              <div className="mt-1.5 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] text-muted-foreground">
                    {summary.best.label}
                  </span>
                  <span className="shrink-0 font-mono text-sm font-semibold text-emerald-500">
                    {fmtCurrency(summary.best.pnl)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] text-muted-foreground">
                    {summary.worst.label}
                  </span>
                  <span className="shrink-0 font-mono text-sm font-semibold text-red-500">
                    {fmtCurrency(summary.worst.pnl)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-1.5 text-sm text-muted-foreground">—</p>
            )}
          </div>
        </div>

        {/* W/L distribution bar */}
        {summary.tradeCount > 0 && (
          <div className="flex items-center gap-3 text-xs">
            <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="bg-emerald-500 transition-all"
                style={{ width: `${(summary.wins / summary.tradeCount) * 100}%` }}
              />
              <div
                className="bg-red-500 transition-all"
                style={{ width: `${(summary.losses / summary.tradeCount) * 100}%` }}
              />
            </div>
            <span className="shrink-0 text-muted-foreground">
              <span className="text-emerald-500">{summary.wins}W</span>
              {" / "}
              <span className="text-red-500">{summary.losses}L</span>
            </span>
          </div>
        )}

        {/* Chart */}
        <div className="overflow-x-auto rounded-lg border border-border/60 bg-muted/20 p-2">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            role="img"
            aria-label={t("performanceChart")}
            className="h-72 min-w-180 w-full cursor-crosshair select-none"
            onMouseMove={chartType === "bars" ? handleBarsHover : handleEquityHover}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              <linearGradient id="jpca-grad-pos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(16,185,129)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="rgb(16,185,129)" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="jpca-grad-neg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(239,68,68)" stopOpacity="0.02" />
                <stop offset="100%" stopColor="rgb(239,68,68)" stopOpacity="0.25" />
              </linearGradient>
              {equityChart && (
                <>
                  <clipPath id="jpca-clip-pos">
                    <rect
                      x={CHART_LEFT}
                      y={CHART_TOP}
                      width={CHART_WIDTH}
                      height={Math.max(0, equityChart.zeroY - CHART_TOP)}
                    />
                  </clipPath>
                  <clipPath id="jpca-clip-neg">
                    <rect
                      x={CHART_LEFT}
                      y={equityChart.zeroY}
                      width={CHART_WIDTH}
                      height={Math.max(0, SVG_HEIGHT - CHART_BOTTOM - equityChart.zeroY)}
                    />
                  </clipPath>
                </>
              )}
            </defs>

            {/* Gridlines + y-axis labels */}
            {activeAxes.map((al) => (
              <g key={al.value}>
                <line
                  x1={CHART_LEFT}
                  x2={SVG_WIDTH - CHART_RIGHT}
                  y1={al.y}
                  y2={al.y}
                  className={al.value === 0 ? "stroke-border" : "stroke-border/40"}
                  strokeWidth={al.value === 0 ? 1.5 : 1}
                  strokeDasharray={al.value === 0 ? undefined : "4 4"}
                />
                <text
                  x={CHART_LEFT - 4}
                  y={al.y + 4}
                  textAnchor="end"
                  className="fill-muted-foreground text-[10px]"
                >
                  {metric === "percent"
                    ? fmtPercent(al.value)
                    : al.value === 0
                      ? "$0"
                      : fmtCurrency(al.value)}
                </text>
              </g>
            ))}

            {/* Bar chart */}
            {chartType === "bars" &&
              buckets.map((bucket, i) => {
                const x = CHART_LEFT + i * (barsChart.barWidth + barsChart.gap);
                const value = barsChart.values[i] ?? 0;
                const barY = yForValue(value, barsChart.maxAbs);
                const height = Math.max(1, Math.abs(barsChart.zeroY - barY));
                const top = value >= 0 ? barY : barsChart.zeroY;
                const isHovered = hoveredIndex === i;
                const showLabel =
                  (i % barsChart.labelStep === 0 || i === buckets.length - 1) && !isHovered;
                return (
                  <g key={bucket.key}>
                    <rect
                      x={x}
                      y={top}
                      width={barsChart.barWidth}
                      height={height}
                      rx="2"
                      className={cn(
                        "transition-opacity",
                        value >= 0
                          ? isHovered
                            ? "fill-emerald-400"
                            : "fill-emerald-500/70"
                          : isHovered
                            ? "fill-red-400"
                            : "fill-red-500/70",
                      )}
                    />
                    {showLabel && (
                      <text
                        x={x + barsChart.barWidth / 2}
                        y={SVG_HEIGHT - 16}
                        textAnchor="middle"
                        className="fill-muted-foreground text-[10px]"
                      >
                        {bucket.label}
                      </text>
                    )}
                    {isHovered && (
                      <text
                        x={x + barsChart.barWidth / 2}
                        y={SVG_HEIGHT - 16}
                        textAnchor="middle"
                        className="fill-foreground text-[10px] font-semibold"
                      >
                        {bucket.label}
                      </text>
                    )}
                  </g>
                );
              })}

            {/* Equity curve */}
            {chartType === "equity" && equityChart && equityPoints.length > 1 && (
              <>
                {/* Drawdown shaded area (between running peak and equity line) */}
                <path d={equityChart.ddAreaPath} fill="rgba(239,68,68,0.10)" />

                {/* Running peak dashed line */}
                <path
                  d={equityChart.peakLinePath}
                  fill="none"
                  strokeWidth="1"
                  strokeDasharray="5 4"
                  className="stroke-muted-foreground/35"
                />

                {/* Equity area fills (positive above zero / negative below zero) */}
                <path
                  d={equityChart.areaPath}
                  clipPath="url(#jpca-clip-pos)"
                  fill="url(#jpca-grad-pos)"
                />
                <path
                  d={equityChart.areaPath}
                  clipPath="url(#jpca-clip-neg)"
                  fill="url(#jpca-grad-neg)"
                />

                {/* Main equity line */}
                <path
                  d={equityChart.linePath}
                  fill="none"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  className={equityChart.positive ? "stroke-emerald-500" : "stroke-red-500"}
                />

                {/* X-axis labels */}
                {equityChart.pts.map((pt, i) => {
                  if (i % equityChart.labelStep !== 0 && i !== equityPoints.length - 1)
                    return null;
                  if (hoveredIndex === i) return null;
                  return (
                    <text
                      key={i}
                      x={pt.x}
                      y={SVG_HEIGHT - 16}
                      textAnchor="middle"
                      className="fill-muted-foreground text-[10px]"
                    >
                      {equityPoints[i]?.label}
                    </text>
                  );
                })}
              </>
            )}

            {/* Hover tooltips */}
            {chartType === "bars" && renderBarsTooltip()}
            {chartType === "equity" && renderEquityTooltip()}
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
