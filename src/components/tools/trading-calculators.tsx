"use client";

import { useMemo, useState } from "react";
import {
  marginRequired,
  pivotClassic,
  positionSizeLots,
} from "@/lib/calculators";

export function TradingCalculators() {
  const [balance, setBalance] = useState(10000);
  const [riskPct, setRiskPct] = useState(1);
  const [slPips, setSlPips] = useState(40);
  const [symbol, setSymbol] = useState("EURUSD");
  const [price, setPrice] = useState(1.085);
  const [quote, setQuote] = useState<"USD" | "JPY" | "other">("USD");

  const pos = useMemo(
    () =>
      positionSizeLots({
        balance,
        riskPct,
        stopLossPips: slPips,
        symbol,
        price: symbol.includes("JPY") ? 149.2 : price,
        quote: symbol.includes("JPY") ? "JPY" : quote,
      }),
    [balance, riskPct, slPips, symbol, price, quote],
  );

  const [h, setH] = useState(1.09);
  const [l, setL] = useState(1.08);
  const [c, setC] = useState(1.085);
  const pivots = useMemo(() => pivotClassic(h, l, c), [h, l, c]);

  const [lots, setLots] = useState(0.5);
  const [lev, setLev] = useState(30);
  const margin = useMemo(
    () =>
      marginRequired({
        contractSize: 100000,
        lots,
        price,
        leverage: lev,
      }),
    [lots, price, lev],
  );

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <section className="rounded-xl border border-border bg-muted/15 p-5">
        <h3 className="text-lg font-medium text-foreground">Position size</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Lot gợi ý theo % rủi ro và khoảng cách SL (pip).
        </p>
        <div className="mt-4 space-y-3 text-sm">
          <label className="block">
            <span className="text-muted-foreground">Vốn ($)</span>
            <input
              type="number"
              className="mt-1 w-full rounded border border-input bg-background px-3 py-2 font-mono"
              value={balance}
              onChange={(e) => setBalance(Number(e.target.value))}
            />
          </label>
          <label className="block">
            <span className="text-muted-foreground">Rủi ro %</span>
            <input
              type="number"
              step="0.1"
              className="mt-1 w-full rounded border border-input bg-background px-3 py-2 font-mono"
              value={riskPct}
              onChange={(e) => setRiskPct(Number(e.target.value))}
            />
          </label>
          <label className="block">
            <span className="text-muted-foreground">Stop loss (pip)</span>
            <input
              type="number"
              className="mt-1 w-full rounded border border-input bg-background px-3 py-2 font-mono"
              value={slPips}
              onChange={(e) => setSlPips(Number(e.target.value))}
            />
          </label>
          <label className="block">
            <span className="text-muted-foreground">Symbol</span>
            <input
              className="mt-1 w-full rounded border border-input bg-background px-3 py-2 font-mono uppercase"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
            />
          </label>
          {!symbol.includes("JPY") && (
            <label className="block">
              <span className="text-muted-foreground">Giá hiện tại</span>
              <input
                type="number"
                step="0.00001"
                className="mt-1 w-full rounded border border-input bg-background px-3 py-2 font-mono"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
            </label>
          )}
          {!symbol.includes("JPY") && (
            <label className="block">
              <span className="text-muted-foreground">Quote account</span>
              <select
                className="mt-1 w-full rounded border border-input bg-background px-3 py-2"
                value={quote}
                onChange={(e) =>
                  setQuote(e.target.value as "USD" | "JPY" | "other")
                }
              >
                <option value="USD">USD</option>
                <option value="other">Khác (xấp xỉ USD)</option>
                <option value="JPY">JPY</option>
              </select>
            </label>
          )}
        </div>
        <dl className="mt-4 space-y-1 rounded-lg bg-muted/30 p-3 font-mono text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Rủi ro $</dt>
            <dd>{pos.riskAmount}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Pip value / lot</dt>
            <dd>{pos.pipValuePerLot}</dd>
          </div>
          <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
            <dt>Lots gợi ý</dt>
            <dd>{pos.lots}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-border bg-muted/15 p-5">
        <h3 className="text-lg font-medium text-foreground">Pivot (classic)</h3>
        <p className="mt-1 text-sm text-muted-foreground">H, L, Close phiên trước.</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <label className="col-span-1">
            <span className="text-muted-foreground">High</span>
            <input
              type="number"
              step="0.00001"
              className="mt-1 w-full rounded border border-input bg-background px-2 py-1 font-mono"
              value={h}
              onChange={(e) => setH(Number(e.target.value))}
            />
          </label>
          <label className="col-span-1">
            <span className="text-muted-foreground">Low</span>
            <input
              type="number"
              step="0.00001"
              className="mt-1 w-full rounded border border-input bg-background px-2 py-1 font-mono"
              value={l}
              onChange={(e) => setL(Number(e.target.value))}
            />
          </label>
          <label className="col-span-1">
            <span className="text-muted-foreground">Close</span>
            <input
              type="number"
              step="0.00001"
              className="mt-1 w-full rounded border border-input bg-background px-2 py-1 font-mono"
              value={c}
              onChange={(e) => setC(Number(e.target.value))}
            />
          </label>
        </div>
        <ul className="mt-4 space-y-1 font-mono text-sm text-foreground/80">
          <li>P: {pivots.pivot}</li>
          <li className="text-sky-600 dark:text-sky-400">R1 {pivots.r1} · R2 {pivots.r2} · R3 {pivots.r3}</li>
          <li className="text-amber-600 dark:text-amber-400/90">S1 {pivots.s1} · S2 {pivots.s2} · S3 {pivots.s3}</li>
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-muted/15 p-5">
        <h3 className="text-lg font-medium text-foreground">Ký quỹ (ước lượng)</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Notional / đòn bẩy — minh họa; từng sàn có công thức riêng.
        </p>
        <div className="mt-4 space-y-3 text-sm">
          <label className="block">
            <span className="text-muted-foreground">Lots</span>
            <input
              type="number"
              step="0.01"
              className="mt-1 w-full rounded border border-input bg-background px-3 py-2 font-mono"
              value={lots}
              onChange={(e) => setLots(Number(e.target.value))}
            />
          </label>
          <label className="block">
            <span className="text-muted-foreground">Giá</span>
            <input
              type="number"
              step="0.00001"
              className="mt-1 w-full rounded border border-input bg-background px-3 py-2 font-mono"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </label>
          <label className="block">
            <span className="text-muted-foreground">Đòn bẩy</span>
            <input
              type="number"
              className="mt-1 w-full rounded border border-input bg-background px-3 py-2 font-mono"
              value={lev}
              onChange={(e) => setLev(Number(e.target.value))}
            />
          </label>
        </div>
        <p className="mt-4 rounded-lg bg-muted/30 p-3 font-mono text-emerald-600 dark:text-emerald-400">
          Margin ≈ ${margin}
        </p>
      </section>
    </div>
  );
}
