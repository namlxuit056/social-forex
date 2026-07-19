"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { LineChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type EquityChartPoint = { date: string; r: number; cumR: number };
export type EquityChartMonth = {
  key: string;
  r: number;
  wins: number;
  losses: number;
};

type View = "equity" | "monthly";

const SVG_WIDTH = 960;
const SVG_HEIGHT = 260;
const CHART_TOP = 26;
const CHART_RIGHT = 24;
const CHART_BOTTOM = 40;
const CHART_LEFT = 56;
const CHART_HEIGHT = SVG_HEIGHT - CHART_TOP - CHART_BOTTOM;
const CHART_WIDTH = SVG_WIDTH - CHART_LEFT - CHART_RIGHT;

function fmtR(v: number) {
  const sign = v >= 0 ? "+" : "-";
  return `${sign}${Math.abs(v).toFixed(1)}R`;
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

export function ProviderEquityChart({
  points,
  monthly,
  locale,
}: {
  points: EquityChartPoint[];
  monthly: EquityChartMonth[];
  locale: string;
}) {
  const t = useTranslations("profile");
  const [view, setView] = useState<View>("equity");
  const [hovered, setHovered] = useState<number | null>(null);

  const fmtDate = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      }),
    [locale],
  );
  const fmtMonth = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
        month: "2-digit",
        year: "2-digit",
      }),
    [locale],
  );

  const totalR = points.length > 0 ? points[points.length - 1].cumR : 0;

  const equity = useMemo(() => {
    if (points.length < 2) return null;
    const maxAbs = Math.max(0.5, ...points.map((p) => Math.abs(p.cumR)));
    const first = new Date(points[0].date).getTime();
    const span = new Date(points[points.length - 1].date).getTime() - first;
    const pts = points.map((p, i) => ({
      x:
        span === 0
          ? CHART_LEFT + (i / (points.length - 1)) * CHART_WIDTH
          : CHART_LEFT + ((new Date(p.date).getTime() - first) / span) * CHART_WIDTH,
      y: yForValue(p.cumR, maxAbs),
    }));
    const linePath = pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ");
    const bottom = SVG_HEIGHT - CHART_BOTTOM;
    const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${bottom} L${pts[0].x.toFixed(1)},${bottom} Z`;
    return { maxAbs, pts, linePath, areaPath, axes: axisLabels(maxAbs) };
  }, [points]);

  const bars = useMemo(() => {
    if (monthly.length === 0) return null;
    const maxAbs = Math.max(0.5, ...monthly.map((m) => Math.abs(m.r)));
    const gap = monthly.length > 30 ? 2 : 6;
    const barWidth = Math.max(
      3,
      (CHART_WIDTH - gap * Math.max(0, monthly.length - 1)) /
        Math.max(1, monthly.length),
    );
    const labelStep = Math.max(1, Math.ceil(monthly.length / 8));
    return { maxAbs, gap, barWidth, labelStep, zeroY: yForValue(0, maxAbs), axes: axisLabels(maxAbs) };
  }, [monthly]);

  function monthLabel(key: string) {
    const [y, m] = key.split("-").map(Number);
    return fmtMonth.format(new Date(y, m - 1, 1));
  }

  const hoveredEquity =
    view === "equity" && hovered !== null && equity ? points[hovered] : null;
  const hoveredMonth =
    view === "monthly" && hovered !== null && bars ? monthly[hovered] : null;

  return (
    <Card className="border-border bg-card/50 ring-1 ring-foreground/5">
      <CardHeader className="flex flex-wrap items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2 font-heading text-base font-semibold text-foreground">
          <LineChart className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          {t("equityChart.title")}
          <span
            className={cn(
              "font-mono text-sm",
              totalR >= 0 ? "text-emerald-500" : "text-red-500",
            )}
          >
            {fmtR(totalR)}
          </span>
        </CardTitle>
        <div className="flex gap-1 rounded-lg border border-border p-0.5">
          {(["equity", "monthly"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setView(v);
                setHovered(null);
              }}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                view === v
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(v === "equity" ? "equityChart.viewEquity" : "equityChart.viewMonthly")}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-2 text-xs text-muted-foreground">
          {t("equityChart.note", { count: points.length })}
        </p>
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className="min-w-[640px] w-full"
            onMouseLeave={() => setHovered(null)}
            role="img"
            aria-label={t("equityChart.title")}
          >
            {(view === "equity" ? equity?.axes : bars?.axes)?.map((a) => (
              <g key={a.value}>
                <line
                  x1={CHART_LEFT}
                  x2={SVG_WIDTH - CHART_RIGHT}
                  y1={a.y}
                  y2={a.y}
                  className="stroke-border"
                  strokeWidth={a.value === 0 ? 1 : 0.5}
                  strokeDasharray={a.value === 0 ? undefined : "3 4"}
                />
                <text
                  x={CHART_LEFT - 8}
                  y={a.y + 3}
                  textAnchor="end"
                  className="fill-muted-foreground text-[10px]"
                >
                  {fmtR(a.value)}
                </text>
              </g>
            ))}

            {view === "equity" && equity && (
              <>
                <path
                  d={equity.areaPath}
                  className={cn(
                    "opacity-10",
                    totalR >= 0 ? "fill-emerald-500" : "fill-red-500",
                  )}
                />
                <path
                  d={equity.linePath}
                  fill="none"
                  strokeWidth={2}
                  className={cn(totalR >= 0 ? "stroke-emerald-500" : "stroke-red-500")}
                />
                {equity.pts.map((p, i) => (
                  <rect
                    key={i}
                    x={
                      i === 0
                        ? CHART_LEFT
                        : (equity.pts[i - 1].x + p.x) / 2
                    }
                    y={CHART_TOP}
                    width={
                      (i === equity.pts.length - 1
                        ? SVG_WIDTH - CHART_RIGHT
                        : (p.x + equity.pts[i + 1].x) / 2) -
                      (i === 0 ? CHART_LEFT : (equity.pts[i - 1].x + p.x) / 2)
                    }
                    height={CHART_HEIGHT}
                    fill="transparent"
                    onMouseEnter={() => setHovered(i)}
                  />
                ))}
                {hoveredEquity && (
                  <g pointerEvents="none">
                    <circle
                      cx={equity.pts[hovered!].x}
                      cy={equity.pts[hovered!].y}
                      r={4}
                      className={cn(
                        hoveredEquity.cumR >= 0 ? "fill-emerald-500" : "fill-red-500",
                      )}
                    />
                    <circle
                      cx={equity.pts[hovered!].x}
                      cy={equity.pts[hovered!].y}
                      r={2}
                      className="fill-card"
                    />
                    <ChartTooltip
                      x={equity.pts[hovered!].x}
                      y={equity.pts[hovered!].y}
                      main={fmtR(hoveredEquity.cumR)}
                      mainPositive={hoveredEquity.cumR >= 0}
                      sub={fmtDate.format(new Date(hoveredEquity.date))}
                    />
                  </g>
                )}
              </>
            )}

            {view === "monthly" &&
              bars &&
              monthly.map((m, i) => {
                const x = CHART_LEFT + i * (bars.barWidth + bars.gap);
                const y = yForValue(m.r, bars.maxAbs);
                const isPos = m.r >= 0;
                const barY = isPos ? y : bars.zeroY;
                const barH = Math.max(1, Math.abs(y - bars.zeroY));
                return (
                  <g key={m.key}>
                    <rect
                      x={x}
                      y={barY}
                      width={bars.barWidth}
                      height={barH}
                      rx={2}
                      className={cn(
                        isPos ? "fill-emerald-500" : "fill-red-500",
                        hovered === i ? "opacity-100" : "opacity-80",
                      )}
                    />
                    <rect
                      x={x}
                      y={CHART_TOP}
                      width={bars.barWidth + bars.gap}
                      height={CHART_HEIGHT}
                      fill="transparent"
                      onMouseEnter={() => setHovered(i)}
                    />
                    {i % bars.labelStep === 0 && (
                      <text
                        x={x + bars.barWidth / 2}
                        y={SVG_HEIGHT - CHART_BOTTOM + 16}
                        textAnchor="middle"
                        className="fill-muted-foreground text-[10px]"
                      >
                        {monthLabel(m.key)}
                      </text>
                    )}
                  </g>
                );
              })}
            {hoveredMonth && bars && (
              <g pointerEvents="none">
                <ChartTooltip
                  x={
                    CHART_LEFT +
                    hovered! * (bars.barWidth + bars.gap) +
                    bars.barWidth / 2
                  }
                  y={yForValue(hoveredMonth.r, bars.maxAbs)}
                  main={fmtR(hoveredMonth.r)}
                  mainPositive={hoveredMonth.r >= 0}
                  sub={`${monthLabel(hoveredMonth.key)} · ${hoveredMonth.wins}W/${hoveredMonth.losses}L`}
                />
              </g>
            )}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartTooltip({
  x,
  y,
  main,
  mainPositive,
  sub,
}: {
  x: number;
  y: number;
  main: string;
  mainPositive: boolean;
  sub: string;
}) {
  const tx = Math.min(Math.max(x, CHART_LEFT + 60), SVG_WIDTH - CHART_RIGHT - 60);
  const above = y > CHART_TOP + 56;
  const ty = above ? y - 14 : y + 52;
  return (
    <g>
      <rect
        x={tx - 58}
        y={ty - 30}
        width={116}
        height={40}
        rx={5}
        className="fill-card stroke-border"
        strokeWidth={1}
      />
      <text
        x={tx}
        y={ty - 14}
        textAnchor="middle"
        className={cn(
          "text-[12px] font-bold",
          mainPositive ? "fill-emerald-500" : "fill-red-500",
        )}
      >
        {main}
      </text>
      <text x={tx} y={ty + 2} textAnchor="middle" className="fill-muted-foreground text-[10px]">
        {sub}
      </text>
    </g>
  );
}
