"use client";

import { useMemo, useState } from "react";

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
  const [trades, setTrades] = useState(200);
  const [winRate, setWinRate] = useState(48);
  const [rr, setRr] = useState(1.5);

  const series = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    let equity = 10000;
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

  const final = series[series.length - 1]?.y ?? 10000;
  const ret = (((final - 10000) / 10000) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm">
          <span className="text-zinc-400">Số lệnh mô phỏng</span>
          <input
            type="number"
            min={10}
            max={2000}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono"
            value={trades}
            onChange={(e) => setTrades(Number(e.target.value))}
          />
        </label>
        <label className="text-sm">
          <span className="text-zinc-400">Tỷ lệ thắng %</span>
          <input
            type="number"
            min={1}
            max={99}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono"
            value={winRate}
            onChange={(e) => setWinRate(Number(e.target.value))}
          />
        </label>
        <label className="text-sm">
          <span className="text-zinc-400">R:R khi thắng</span>
          <input
            type="number"
            step="0.1"
            min={0.5}
            max={5}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono"
            value={rr}
            onChange={(e) => setRr(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <p className="text-sm text-zinc-400">
          Equity cuối (mô phỏng):{" "}
          <span className="font-mono text-emerald-400">{final}</span> USD · Lợi nhuận
          gần đúng: <span className="font-mono">{ret}%</span>
        </p>
        <div className="mt-4 flex h-40 items-end gap-px overflow-hidden rounded bg-zinc-950">
          {series.filter((_, i) => i % Math.ceil(trades / 80) === 0).map((p, i) => {
            const h = Math.max(
              4,
              ((p.y - 5000) / 15000) * 100 + 50,
            );
            return (
              <div
                key={i}
                className="min-w-[2px] flex-1 bg-emerald-600/80"
                style={{ height: `${Math.min(100, h)}%` }}
                title={`${p.y}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
