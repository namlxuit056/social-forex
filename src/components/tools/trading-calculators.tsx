"use client";

import { useState, useMemo, useCallback } from "react";
import { Check, Copy } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RiskCalculator } from "@/components/tools/risk-calculator";
import { pivotClassic, contractSize, marginRequired } from "@/lib/calculators";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Pivot points tab
// ---------------------------------------------------------------------------

function useCopy(resetMs = 1500) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = useCallback(
    (key: string, value: string) => {
      navigator.clipboard.writeText(value).catch(() => null);
      setCopied(key);
      setTimeout(() => setCopied(null), resetMs);
    },
    [resetMs],
  );
  return { copied, copy };
}

function CopyBtn({ id, value, copied, onCopy }: {
  id: string;
  value: string;
  copied: string | null;
  onCopy: (id: string, value: string) => void;
}) {
  const done = copied === id;
  return (
    <button
      onClick={() => onCopy(id, value)}
      aria-label={done ? "Copied" : "Copy"}
      className="ml-1.5 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
    >
      {done ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
    </button>
  );
}

function PivotRow({
  label,
  value,
  color,
  id,
  copied,
  onCopy,
}: {
  label: string;
  value: number;
  color?: string;
  id: string;
  copied: string | null;
  onCopy: (id: string, value: string) => void;
}) {
  const str = value.toFixed(5);
  return (
    <div className={cn("group flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/30", color)}>
      <span className="w-8 shrink-0 text-xs font-semibold">{label}</span>
      <span className="font-mono text-sm">{str}</span>
      <CopyBtn id={id} value={str} copied={copied} onCopy={onCopy} />
    </div>
  );
}

function PivotCalculator() {
  const [h, setH] = useLocalStorage("tools:pivot:h", "1.09000");
  const [l, setL] = useLocalStorage("tools:pivot:l", "1.08000");
  const [c, setC] = useLocalStorage("tools:pivot:c", "1.08500");

  const pivots = useMemo(() => {
    const hv = parseFloat(h);
    const lv = parseFloat(l);
    const cv = parseFloat(c);
    if (!Number.isFinite(hv) || !Number.isFinite(lv) || !Number.isFinite(cv)) return null;
    return pivotClassic(hv, lv, cv);
  }, [h, l, c]);

  const { copied, copy } = useCopy();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">H, L, Close from the previous session.</p>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pv-h" className="text-xs text-muted-foreground">High</Label>
          <Input id="pv-h" type="number" step="0.00001" value={h} onChange={(e) => setH(e.target.value)} className="h-9 font-mono text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pv-l" className="text-xs text-muted-foreground">Low</Label>
          <Input id="pv-l" type="number" step="0.00001" value={l} onChange={(e) => setL(e.target.value)} className="h-9 font-mono text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pv-c" className="text-xs text-muted-foreground">Close</Label>
          <Input id="pv-c" type="number" step="0.00001" value={c} onChange={(e) => setC(e.target.value)} className="h-9 font-mono text-sm" />
        </div>
      </div>

      {pivots ? (
        <div className="rounded-lg border border-border/60 bg-muted/10 p-2">
          <PivotRow label="R3" value={pivots.r3} color="text-sky-600 dark:text-sky-400" id="r3" copied={copied} onCopy={copy} />
          <PivotRow label="R2" value={pivots.r2} color="text-sky-600 dark:text-sky-400" id="r2" copied={copied} onCopy={copy} />
          <PivotRow label="R1" value={pivots.r1} color="text-sky-600 dark:text-sky-400" id="r1" copied={copied} onCopy={copy} />
          <div className="my-1 border-t border-border/40" />
          <PivotRow label="P" value={pivots.pivot} color="text-foreground font-bold" id="p" copied={copied} onCopy={copy} />
          <div className="my-1 border-t border-border/40" />
          <PivotRow label="S1" value={pivots.s1} color="text-amber-600 dark:text-amber-400" id="s1" copied={copied} onCopy={copy} />
          <PivotRow label="S2" value={pivots.s2} color="text-amber-600 dark:text-amber-400" id="s2" copied={copied} onCopy={copy} />
          <PivotRow label="S3" value={pivots.s3} color="text-amber-600 dark:text-amber-400" id="s3" copied={copied} onCopy={copy} />
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-3 text-center text-xs text-muted-foreground">
          Enter H, L, C to calculate pivot.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Margin calculator tab
// ---------------------------------------------------------------------------

const MARGIN_PRESETS = ["EURUSD", "USDJPY", "XAUUSD", "BTCUSD"];

function MarginCalculator() {
  const [symbol, setSymbol] = useLocalStorage("tools:margin:symbol", "EURUSD");
  const [lots, setLots] = useLocalStorage("tools:margin:lots", "0.10");
  const [price, setPrice] = useLocalStorage("tools:margin:price", "1.08500");
  const [leverage, setLeverage] = useLocalStorage("tools:margin:leverage", "100");

  const result = useMemo(() => {
    const lotsV = parseFloat(lots);
    const priceV = parseFloat(price);
    const levV = parseFloat(leverage);
    if (!Number.isFinite(lotsV) || !Number.isFinite(priceV) || !Number.isFinite(levV)) return null;
    if (lotsV <= 0 || priceV <= 0 || levV <= 0) return null;
    const cs = contractSize(symbol);
    const notional = cs * lotsV * priceV;
    const margin = marginRequired({ contractSize: cs, lots: lotsV, price: priceV, leverage: levV });
    return { cs, notional, margin };
  }, [symbol, lots, price, leverage]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Estimated notional / leverage. Actual values may vary by broker.</p>

      <div className="flex flex-wrap gap-1.5">
        {MARGIN_PRESETS.map((s) => (
          <button
            key={s}
            onClick={() => setSymbol(s)}
            className={cn(
              "rounded-md border px-2.5 py-0.5 font-mono text-xs transition-colors",
              symbol.toUpperCase() === s
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:border-primary/50 hover:text-foreground",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="mg-symbol" className="text-xs text-muted-foreground">Symbol</Label>
          <Input
            id="mg-symbol"
            placeholder="EURUSD"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="h-9 font-mono text-sm uppercase"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mg-lots" className="text-xs text-muted-foreground">Lots</Label>
          <Input
            id="mg-lots"
            type="number"
            step="0.01"
            placeholder="0.10"
            value={lots}
            onChange={(e) => setLots(e.target.value)}
            className="h-9 font-mono text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mg-price" className="text-xs text-muted-foreground">Current price</Label>
          <Input
            id="mg-price"
            type="number"
            step="0.00001"
            placeholder="1.08500"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="h-9 font-mono text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mg-lev" className="text-xs text-muted-foreground">Leverage</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              1:
            </span>
            <Input
              id="mg-lev"
              type="number"
              placeholder="100"
              value={leverage}
              onChange={(e) => setLeverage(e.target.value)}
              className="h-9 pl-7 font-mono text-sm"
            />
          </div>
        </div>
      </div>

      {result ? (
        <div className="grid grid-cols-3 gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
          <div>
            <p className="text-[11px] text-muted-foreground">Contract size</p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">
              {result.cs.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Notional</p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">
              ${result.notional.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Margin required</p>
            <p className="mt-0.5 font-mono text-base font-bold text-primary">
              ${result.margin.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-3 text-center text-xs text-muted-foreground">
          Enter all fields to calculate margin.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function TradingCalculators() {
  const [tab, setTab] = useLocalStorage("tools:tab", "position");

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <TabsList className="h-9">
        <TabsTrigger value="position" className="text-sm">Position Size</TabsTrigger>
        <TabsTrigger value="pivot" className="text-sm">Pivot Points</TabsTrigger>
        <TabsTrigger value="margin" className="text-sm">Margin</TabsTrigger>
      </TabsList>

      <TabsContent value="position">
        <RiskCalculator storageKey="tools:risk" />
      </TabsContent>

      <TabsContent value="pivot">
        <div className="rounded-xl border border-border bg-muted/15 p-5">
          <h3 className="text-base font-medium text-foreground">Pivot Points (Classic)</h3>
          <div className="mt-3">
            <PivotCalculator />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="margin">
        <div className="rounded-xl border border-border bg-muted/15 p-5">
          <h3 className="text-base font-medium text-foreground">Margin</h3>
          <div className="mt-3">
            <MarginCalculator />
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
