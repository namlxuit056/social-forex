"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pipSize, contractSize } from "@/lib/calculators";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { cn } from "@/lib/utils";

const SYMBOL_PRESETS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "BTCUSD"];

interface Props {
  defaultBalance?: number | null;
  defaultEntry?: number | null;
  defaultStopLoss?: number | null;
  defaultTakeProfit?: number | null;
  defaultSymbol?: string;
  /** When provided, form state is persisted to localStorage under this key prefix */
  storageKey?: string;
}

function pipValuePerLot(symbol: string, price: number): number {
  const s = symbol.toUpperCase();
  const contract = contractSize(symbol);
  const pip = pipSize(symbol);
  // JPY-quoted pairs (e.g. USDJPY, EURJPY): divide by price to convert to USD
  if (s.endsWith("JPY") && !s.startsWith("XAU") && !s.startsWith("BTC")) {
    return (contract * pip) / price;
  }
  return contract * pip;
}

function calcResults(
  balance: number,
  riskPct: number,
  entry: number,
  stopLoss: number,
  symbol: string,
) {
  if (balance <= 0 || riskPct <= 0 || entry <= 0 || stopLoss <= 0 || entry === stopLoss) {
    return null;
  }
  const pip = pipSize(symbol);
  const pipDistance = Math.abs(entry - stopLoss) / pip;
  const dollarRisk = (balance * riskPct) / 100;
  const pipVal = pipValuePerLot(symbol, entry);
  const lotSize = dollarRisk / (pipDistance * pipVal);
  return {
    dollarRisk,
    pipDistance,
    lotSize: Math.max(0.01, Math.round(lotSize * 100) / 100),
    pipValue: lotSize * pipVal,
  };
}

function parse(v: string): number {
  return parseFloat(v.replace(",", "."));
}

export function RiskCalculator({
  defaultBalance,
  defaultEntry,
  defaultStopLoss,
  defaultTakeProfit,
  defaultSymbol = "",
  storageKey,
}: Props) {
  const t = useTranslations("riskCalc");

  const sk = storageKey ?? "";
  const [symbol, setSymbol] = useLocalStorage(sk ? `${sk}:symbol` : "", defaultSymbol);
  const [balance, setBalance] = useLocalStorage(
    sk ? `${sk}:balance` : "",
    defaultBalance ? String(defaultBalance) : "",
  );
  const [riskPct, setRiskPct] = useLocalStorage(sk ? `${sk}:riskPct` : "", "1");
  const [entry, setEntry] = useLocalStorage(
    sk ? `${sk}:entry` : "",
    defaultEntry ? String(defaultEntry) : "",
  );
  const [stopLoss, setStopLoss] = useLocalStorage(
    sk ? `${sk}:sl` : "",
    defaultStopLoss ? String(defaultStopLoss) : "",
  );
  const [takeProfit, setTakeProfit] = useLocalStorage(
    sk ? `${sk}:tp` : "",
    defaultTakeProfit ? String(defaultTakeProfit) : "",
  );

  const result = useMemo(() => {
    const b = parse(balance);
    const r = parse(riskPct);
    const e = parse(entry);
    const sl = parse(stopLoss);
    if (!Number.isFinite(b) || !Number.isFinite(r) || !Number.isFinite(e) || !Number.isFinite(sl))
      return null;
    return calcResults(b, r, e, sl, symbol);
  }, [balance, riskPct, entry, stopLoss, symbol]);

  const rrRatio = useMemo(() => {
    const tp = parse(takeProfit);
    const e = parse(entry);
    const sl = parse(stopLoss);
    if (
      !Number.isFinite(tp) ||
      !Number.isFinite(e) ||
      !Number.isFinite(sl) ||
      tp === e ||
      e === sl
    )
      return null;
    return Math.abs(tp - e) / Math.abs(sl - e);
  }, [takeProfit, entry, stopLoss]);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="size-4 text-primary" aria-hidden />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Symbol presets */}
        <div className="flex flex-wrap gap-1.5">
          {SYMBOL_PRESETS.map((s) => (
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

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="rc-symbol" className="text-xs text-muted-foreground">
              {t("symbol")}
            </Label>
            <Input
              id="rc-symbol"
              placeholder="EURUSD"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="h-9 font-mono text-sm uppercase"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rc-balance" className="text-xs text-muted-foreground">
              {t("balance")}
            </Label>
            <Input
              id="rc-balance"
              type="number"
              placeholder="10000"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="h-9 font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rc-risk" className="text-xs text-muted-foreground">
              {t("riskPct")}
            </Label>
            <div className="relative">
              <Input
                id="rc-risk"
                type="number"
                placeholder="1"
                min="0.1"
                max="100"
                step="0.1"
                value={riskPct}
                onChange={(e) => setRiskPct(e.target.value)}
                className="h-9 pr-6 font-mono text-sm"
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                %
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="rc-entry" className="text-xs text-muted-foreground">
              {t("entry")}
            </Label>
            <Input
              id="rc-entry"
              type="number"
              placeholder="1.08500"
              step="0.00001"
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              className="h-9 font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rc-sl" className="text-xs text-muted-foreground">
              {t("stopLoss")}
            </Label>
            <Input
              id="rc-sl"
              type="number"
              placeholder="1.08200"
              step="0.00001"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="h-9 font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rc-tp" className="text-xs text-muted-foreground">
              {t("takeProfit")}{" "}
              <span className="text-muted-foreground/50">{t("tpOptional")}</span>
            </Label>
            <Input
              id="rc-tp"
              type="number"
              placeholder="1.09100"
              step="0.00001"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              className="h-9 font-mono text-sm"
            />
          </div>
        </div>

        {result ? (
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 sm:grid-cols-4">
            <div>
              <p className="text-[11px] text-muted-foreground">{t("dollarRisk")}</p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">
                ${result.dollarRisk.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">{t("pipDistance")}</p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">
                {result.pipDistance.toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">{t("lotSize")}</p>
              <p className="mt-0.5 font-mono text-base font-bold text-primary">
                {result.lotSize.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">{t("pipValue")}</p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">
                ${result.pipValue.toFixed(2)}/pip
              </p>
            </div>
            {rrRatio !== null && (
              <div className="col-span-2 sm:col-span-4 border-t border-border/40 pt-3">
                <p className="text-[11px] text-muted-foreground">{t("riskReward")}</p>
                <p
                  className={cn(
                    "mt-0.5 font-mono text-sm font-bold",
                    rrRatio >= 2
                      ? "text-emerald-600 dark:text-emerald-400"
                      : rrRatio >= 1
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-destructive",
                  )}
                >
                  1 : {rrRatio.toFixed(2)}
                  {rrRatio >= 2 && " ✓"}
                  {rrRatio < 1 && t("rrLow")}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-3 text-center text-xs text-muted-foreground">
            {t("fillHint")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
