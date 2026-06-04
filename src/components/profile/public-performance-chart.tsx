"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { TrendingUp, Flame, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface PublicChartTrade {
  pnl: number | null;
  result: string;
  closedAt: string | null;
  openedAt: string;
}

interface EquityPoint {
  index: number;
  cumPnl: number;
  tradePnl: number;
  label: string;
}

const SVG_WIDTH = 880;
const SVG_HEIGHT = 230;
const CHART_TOP = 28;
const CHART_RIGHT = 20;
const CHART_BOTTOM = 38;
const CHART_LEFT = 60;
const CHART_HEIGHT = SVG_HEIGHT - CHART_TOP - CHART_BOTTOM;
const CHART_WIDTH = SVG_WIDTH - CHART_LEFT - CHART_RIGHT;

function fmtCurrency(v: number) {
  const sign = v >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(v).toFixed(2)}`;
}

function yForValue(value: number, maxAbs: number) {
  const zeroY = CHART_TOP + CHART_HEIGHT / 2;
  if (maxAbs === 0) return zeroY;
  return zeroY - (value / maxAbs) * (CHART_HEIGHT / 2);
}

function buildEquityPoints(trades: PublicChartTrade[], locale: string): EquityPoint[] {
  const sorted = trades
    .filter((t) => t.result !== "PENDING")
    .sort(
      (a, b) =>
        new Date(a.closedAt ?? a.openedAt).getTime() -
        new Date(b.closedAt ?? b.openedAt).getTime(),
    );

  let cum = 0;
  return sorted.map((trade, i) => {
    cum += trade.pnl ?? 0;
    const date = new Date(trade.closedAt ?? trade.openedAt);
    return {
      index: i,
      cumPnl: cum,
      tradePnl: trade.pnl ?? 0,
      label: date.toLocaleDateString(locale, { month: "short", day: "numeric" }),
    };
  });
}

function computeStreak(trades: PublicChartTrade[]): { count: number; type: "WIN" | "LOSS" | null } {
  const wl = trades
    .filter((t) => t.result === "WIN" || t.result === "LOSS")
    .sort(
      (a, b) =>
        new Date(b.closedAt ?? b.openedAt).getTime() -
        new Date(a.closedAt ?? a.openedAt).getTime(),
    );
  if (wl.length === 0) return { count: 0, type: null };
  const type = wl[0].result as "WIN" | "LOSS";
  let count = 0;
  for (const t of wl) {
    if (t.result === type) count++;
    else break;
  }
  return { count, type };
}

function axisLabels(maxAbs: number) {
  return [maxAbs, maxAbs / 2, 0, -maxAbs / 2, -maxAbs].map((v) => ({
    value: v,
    y: yForValue(v, maxAbs),
  }));
}

export function PublicPerformanceChart({
  trades,
  locale,
}: {
  trades: PublicChartTrade[];
  locale: string;
}) {
  const t = useTranslations("profile");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const equityPoints = useMemo(
    () => buildEquityPoints(trades, locale === "vi" ? "vi-VN" : "en-US"),
    [trades, locale],
  );

  const streak = useMemo(() => computeStreak(trades), [trades]);

  const stats = useMemo(() => {
    const closed = trades.filter((t) => t.result !== "PENDING");
    const wins = closed.filter((t) => t.result === "WIN").length;
    const losses = closed.filter((t) => t.result === "LOSS").length;
    const totalPnl = closed.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    const grossWin = closed
      .filter((t) => t.result === "WIN")
      .reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    const grossLoss = Math.abs(
      closed
        .filter((t) => t.result === "LOSS")
        .reduce((sum, t) => sum + (t.pnl ?? 0), 0),
    );
    const profitFactor =
      grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;
    const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
    return { totalPnl, wins, losses, winRate, profitFactor, tradeCount: closed.length };
  }, [trades]);

  const chart = useMemo(() => {
    if (equityPoints.length === 0) return null;
    const values = equityPoints.map((p) => p.cumPnl);
    const maxAbs = Math.max(1, ...values.map((v) => Math.abs(v)));
    const zeroY = yForValue(0, maxAbs);
    const xStep = equityPoints.length > 1 ? CHART_WIDTH / (equityPoints.length - 1) : 0;
    const xForIdx = (i: number) => CHART_LEFT + i * xStep;

    const pts = equityPoints.map((_, i) => ({
      x: xForIdx(i),
      y: yForValue(values[i] ?? 0, maxAbs),
    }));

    const linePath = pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ");

    const bottom = SVG_HEIGHT - CHART_BOTTOM;
    const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${bottom} L${pts[0].x.toFixed(1)},${bottom} Z`;

    // Running peak and drawdown
    let peak = values[0] ?? 0;
    const runningPeaks: number[] = [];
    let maxDD = 0;
    for (const v of values) {
      if (v > peak) peak = v;
      runningPeaks.push(peak);
      const dd = v - peak;
      if (dd < maxDD) maxDD = dd;
    }

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

    const peakLinePath = pts
      .map((pt, i) => {
        const py = yForValue(runningPeaks[i] ?? 0, maxAbs);
        return `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${py.toFixed(1)}`;
      })
      .join(" ");

    const labelStep = Math.max(1, Math.ceil(equityPoints.length / 6));

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
      maxDD,
      positive: values[values.length - 1] >= 0,
    };
  }, [equityPoints]);

  const handleHover = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || !chart) return;
      const rect = svgRef.current.getBoundingClientRect();
      const svgX = ((e.clientX - rect.left) / rect.width) * SVG_WIDTH;
      let closest = 0;
      let minDist = Infinity;
      for (let i = 0; i < chart.pts.length; i++) {
        const dist = Math.abs(chart.pts[i].x - svgX);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      }
      setHoveredIndex(closest);
    },
    [chart],
  );

  const isWinStreak = streak.type === "WIN";
  const isLossStreak = streak.type === "LOSS";

  function renderTooltip() {
    if (hoveredIndex === null || !chart) return null;
    const pt = chart.pts[hoveredIndex];
    const ep = equityPoints[hoveredIndex];
    if (!pt || !ep) return null;
    const value = chart.values[hoveredIndex] ?? 0;
    const peakVal = chart.runningPeaks[hoveredIndex] ?? 0;
    const ddVal = value - peakVal;
    const isPos = value >= 0;
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
          {fmtCurrency(ep.cumPnl)}
        </text>
        <text x={tx} y={ty + 4} textAnchor="middle" className="fill-muted-foreground text-[10px]">
          {ep.label}
          {ep.tradePnl !== 0 ? ` · ${fmtCurrency(ep.tradePnl)}` : ""}
        </text>
        {showDd && (
          <text x={tx} y={ty + 18} textAnchor="middle" className="fill-red-400 text-[10px]">
            DD {fmtCurrency(ddVal)}
          </text>
        )}
      </g>
    );
  }

  return (
    <Card className="border-border/60 bg-card/55">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="size-4 text-chart-3" />
          {t("profilePerformanceChart")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {/* Net P&L */}
          <div className="rounded-lg border border-border/60 p-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("overviewNetPnl")}
            </p>
            <p className={cn("mt-1 font-mono text-base font-bold tabular-nums", stats.totalPnl >= 0 ? "text-emerald-500" : "text-red-500")}>
              {fmtCurrency(stats.totalPnl)}
            </p>
          </div>

          {/* Trades */}
          <div className="rounded-lg border border-border/60 p-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("overviewTrades")}
            </p>
            <p className="mt-1 font-mono text-base font-bold tabular-nums text-foreground">
              {stats.tradeCount}
            </p>
          </div>

          {/* Win rate */}
          <div className="rounded-lg border border-border/60 p-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("overviewWinRate")}
            </p>
            <p className={cn("mt-1 font-mono text-base font-bold tabular-nums", stats.winRate >= 50 ? "text-emerald-500" : "text-red-500")}>
              {stats.winRate}%
            </p>
            <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${stats.winRate}%` }} />
            </div>
          </div>

          {/* Streak */}
          <div className={cn(
            "rounded-lg border p-2.5 transition-colors",
            isWinStreak ? "border-emerald-500/30 bg-emerald-500/5"
              : isLossStreak ? "border-red-500/30 bg-red-500/5"
              : "border-border/60",
          )}>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("overviewStreak")}
            </p>
            {streak.count > 0 && streak.type ? (
              <div className="mt-1 flex items-center gap-1">
                {isWinStreak
                  ? <Flame className="size-4 shrink-0 text-emerald-500" />
                  : <TrendingDown className="size-4 shrink-0 text-red-500" />}
                <span className={cn("font-mono text-base font-bold tabular-nums", isWinStreak ? "text-emerald-500" : "text-red-500")}>
                  {streak.count}{isWinStreak ? "W" : "L"}
                </span>
              </div>
            ) : (
              <p className="mt-1 font-mono text-base font-bold text-muted-foreground">—</p>
            )}
          </div>

          {/* Profit factor */}
          <div className="rounded-lg border border-border/60 p-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("overviewProfitFactor")}
            </p>
            <p className={cn("mt-1 font-mono text-base font-bold tabular-nums", stats.profitFactor >= 1 ? "text-emerald-500" : "text-red-500")}>
              {stats.profitFactor === Infinity ? "∞" : stats.profitFactor === 0 ? "—" : stats.profitFactor.toFixed(2)}
            </p>
          </div>

          {/* Max Drawdown */}
          <div className="rounded-lg border border-border/60 p-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("overviewMaxDrawdown")}
            </p>
            <p className={cn("mt-1 font-mono text-base font-bold tabular-nums", !chart || chart.maxDD === 0 ? "text-muted-foreground" : "text-red-500")}>
              {!chart || chart.maxDD === 0 ? "—" : fmtCurrency(chart.maxDD)}
            </p>
          </div>
        </div>

        {/* W/L distribution bar */}
        {stats.tradeCount > 0 && (
          <div className="flex items-center gap-3 text-xs">
            <div className="flex h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="bg-emerald-500 transition-all" style={{ width: `${(stats.wins / stats.tradeCount) * 100}%` }} />
              <div className="bg-red-500 transition-all" style={{ width: `${(stats.losses / stats.tradeCount) * 100}%` }} />
            </div>
            <span className="shrink-0 text-muted-foreground">
              <span className="text-emerald-500">{stats.wins}W</span>
              {" / "}
              <span className="text-red-500">{stats.losses}L</span>
            </span>
          </div>
        )}

        {/* Chart */}
        {equityPoints.length === 0 || !chart ? (
          <p className="rounded-md border border-dashed border-border/70 px-3 py-6 text-sm text-muted-foreground">
            {t("profilePerformanceEmpty")}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/60 bg-muted/20 p-2">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              role="img"
              aria-label={t("profilePerformanceChart")}
              className="h-56 min-w-150 w-full cursor-crosshair select-none"
              onMouseMove={handleHover}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <defs>
                <linearGradient id="ppc-grad-pos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(16,185,129)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="rgb(16,185,129)" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="ppc-grad-neg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(239,68,68)" stopOpacity="0.02" />
                  <stop offset="100%" stopColor="rgb(239,68,68)" stopOpacity="0.25" />
                </linearGradient>
                <clipPath id="ppc-clip-pos">
                  <rect x={CHART_LEFT} y={CHART_TOP} width={CHART_WIDTH} height={Math.max(0, chart.zeroY - CHART_TOP)} />
                </clipPath>
                <clipPath id="ppc-clip-neg">
                  <rect x={CHART_LEFT} y={chart.zeroY} width={CHART_WIDTH} height={Math.max(0, SVG_HEIGHT - CHART_BOTTOM - chart.zeroY)} />
                </clipPath>
              </defs>

              {/* Gridlines + y-axis labels */}
              {chart.axes.map((al) => (
                <g key={al.value}>
                  <line
                    x1={CHART_LEFT} x2={SVG_WIDTH - CHART_RIGHT}
                    y1={al.y} y2={al.y}
                    className={al.value === 0 ? "stroke-border" : "stroke-border/40"}
                    strokeWidth={al.value === 0 ? 1.5 : 1}
                    strokeDasharray={al.value === 0 ? undefined : "4 4"}
                  />
                  <text x={CHART_LEFT - 4} y={al.y + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">
                    {al.value === 0 ? "$0" : fmtCurrency(al.value)}
                  </text>
                </g>
              ))}

              {/* Drawdown shaded area */}
              <path d={chart.ddAreaPath} fill="rgba(239,68,68,0.10)" />

              {/* Running peak dashed line */}
              <path
                d={chart.peakLinePath}
                fill="none"
                strokeWidth="1"
                strokeDasharray="5 4"
                className="stroke-muted-foreground/35"
              />

              {/* Equity area fills */}
              <path d={chart.areaPath} clipPath="url(#ppc-clip-pos)" fill="url(#ppc-grad-pos)" />
              <path d={chart.areaPath} clipPath="url(#ppc-clip-neg)" fill="url(#ppc-grad-neg)" />

              {/* Main line */}
              <path
                d={chart.linePath}
                fill="none"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                className={chart.positive ? "stroke-emerald-500" : "stroke-red-500"}
              />

              {/* X-axis labels */}
              {chart.pts.map((pt, i) => {
                if (i % chart.labelStep !== 0 && i !== equityPoints.length - 1) return null;
                if (hoveredIndex === i) return null;
                return (
                  <text key={i} x={pt.x} y={SVG_HEIGHT - 12} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                    {equityPoints[i]?.label}
                  </text>
                );
              })}

              {/* Hover tooltip */}
              {renderTooltip()}
            </svg>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
