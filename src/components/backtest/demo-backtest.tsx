"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const START_EQUITY = 10000;
const CHART_W = 600;
const CHART_H = 176;

/** PRNG xác định theo tham số — tránh Math.random trong render (React Compiler). */
function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mô phỏng đơn giản — không phải backtest thật; không dùng dữ liệu lịch sử. */
export function DemoBacktest() {
  const t = useTranslations("backtest");
  const [trades, setTrades] = useState(200);
  const [winRate, setWinRate] = useState(48);
  const [rr, setRr] = useState(1.5);

  const series = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    let equity = START_EQUITY;
    pts.push({ x: 0, y: equity });
    const pWin = winRate / 100;
    const seed =
      trades * 7919 + winRate * 97 + Math.round(rr * 10000);
    const rng = mulberry32(seed);
    for (let i = 1; i <= trades; i++) {
      const win = rng() < pWin;
      const r = win ? rr : -1;
      equity += equity * 0.001 * r;
      pts.push({ x: i, y: Math.round(equity) });
    }
    return pts;
  }, [trades, winRate, rr]);

  const final = series[series.length - 1]?.y ?? START_EQUITY;
  const ret = (((final - START_EQUITY) / START_EQUITY) * 100).toFixed(1);

  const chart = useMemo(() => {
    const ys = series.map((p) => p.y);
    const lo = Math.min(START_EQUITY, ...ys);
    const hi = Math.max(START_EQUITY, ...ys);
    const pad = Math.max(1, (hi - lo) * 0.08);
    const min = lo - pad;
    const max = hi + pad;
    const last = Math.max(1, series.length - 1);
    const sx = (x: number) => (x / last) * CHART_W;
    const sy = (y: number) => CHART_H - ((y - min) / (max - min)) * CHART_H;
    const line = series.map((p) => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
    let peak = START_EQUITY;
    let maxDd = 0;
    for (const y of ys) {
      peak = Math.max(peak, y);
      maxDd = Math.max(maxDd, (peak - y) / peak);
    }
    return {
      line,
      area: `0,${CHART_H} ${line} ${CHART_W},${CHART_H}`,
      baseY: sy(START_EQUITY),
      min: Math.round(lo),
      max: Math.round(hi),
      maxDrawdownPct: (maxDd * 100).toFixed(1),
    };
  }, [series]);

  const up = final >= START_EQUITY;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm">
          <span className="text-muted-foreground">{t("simTrades")}</span>
          <input
            type="number"
            min={10}
            max={2000}
            className="mt-1 w-full rounded border border-input bg-background px-3 py-2 font-mono text-foreground"
            value={trades}
            onChange={(e) => setTrades(Number(e.target.value))}
          />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">{t("winRate")}</span>
          <input
            type="number"
            min={1}
            max={99}
            className="mt-1 w-full rounded border border-input bg-background px-3 py-2 font-mono text-foreground"
            value={winRate}
            onChange={(e) => setWinRate(Number(e.target.value))}
          />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">{t("rrOnWin")}</span>
          <input
            type="number"
            step="0.1"
            min={0.5}
            max={5}
            className="mt-1 w-full rounded border border-input bg-background px-3 py-2 font-mono text-foreground"
            value={rr}
            onChange={(e) => setRr(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">{t("finalEquity")}</dt>
            <dd className={cn("mt-0.5 font-mono text-lg font-semibold tabular-nums", up ? "text-success" : "text-danger")}>
              {final.toLocaleString("en-US")} USD
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("approxReturn")}</dt>
            <dd className="mt-0.5 font-mono text-lg font-semibold tabular-nums">{ret}%</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("maxDrawdown")}</dt>
            <dd className="mt-0.5 font-mono text-lg font-semibold tabular-nums">-{chart.maxDrawdownPct}%</dd>
          </div>
        </dl>
        <div className="mt-4 flex gap-2">
          <div className="flex w-14 shrink-0 flex-col justify-between py-0.5 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
            <span>{chart.max.toLocaleString("en-US")}</span>
            <span>{chart.min.toLocaleString("en-US")}</span>
          </div>
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            preserveAspectRatio="none"
            className="h-44 w-full"
            role="img"
            aria-label={`${t("finalEquity")} ${final} USD`}
          >
            <polygon
              points={chart.area}
              className={up ? "fill-success/10" : "fill-danger/10"}
            />
            <line
              x1={0}
              x2={CHART_W}
              y1={chart.baseY}
              y2={chart.baseY}
              className="stroke-border-strong"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />
            <polyline
              points={chart.line}
              fill="none"
              className={up ? "stroke-success" : "stroke-danger"}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {t("baselineNote", { equity: START_EQUITY.toLocaleString("en-US") })}
        </p>
      </div>
    </div>
  );
}
