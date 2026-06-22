"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, ArrowDownRight, Filter, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type ScreenerFilter = "all" | "bullish" | "bearish" | "volatile" | "stable";

type ScreenerPair = {
  symbol: string;
  name: string;
  group: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  rsi: number;
  macd: number;
  ema20: number;
  ema50: number;
  atr: number;
  volatility: number;
};

type Props = {
  pairs: ScreenerPair[];
};

export function MarketScreener({ pairs }: Props) {
  const t = useTranslations("screener");
  const [filter, setFilter] = useState<ScreenerFilter>("all");

  const filtered = useMemo(() => {
    switch (filter) {
      case "bullish":
        return pairs.filter((p) => p.rsi > 50 && p.macd > 0 && p.ema20 > p.ema50);
      case "bearish":
        return pairs.filter((p) => p.rsi < 50 && p.macd < 0 && p.ema20 < p.ema50);
      case "volatile":
        return pairs.filter((p) => p.volatility > 1.5);
      case "stable":
        return pairs.filter((p) => p.volatility < 0.5);
      default:
        return pairs;
    }
  }, [pairs, filter]);

  function getSignal(p: ScreenerPair): "bull" | "bear" | "neutral" {
    const bullScore = (p.rsi > 50 ? 1 : 0) + (p.macd > 0 ? 1 : 0) + (p.ema20 > p.ema50 ? 1 : 0);
    if (bullScore >= 2) return "bull";
    if (bullScore <= 1) return "bear";
    return "neutral";
  }

  function getRsiColor(rsi: number): string {
    if (rsi > 70) return "text-red-500";
    if (rsi < 30) return "text-green-500";
    return "text-muted-foreground";
  }

  const filters: { key: ScreenerFilter; label: string }[] = [
    { key: "all", label: t("filterAll") },
    { key: "bullish", label: t("filterBullish") },
    { key: "bearish", label: t("filterBearish") },
    { key: "volatile", label: t("filterVolatile") },
    { key: "stable", label: t("filterStable") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition",
              filter === f.key
                ? "bg-primary/15 text-primary"
                : "bg-muted/30 text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border/70">
        <table className="w-full min-w-120 text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5">{t("colSymbol")}</th>
              <th className="px-3 py-2.5 text-right">{t("colPrice")}</th>
              <th className="px-3 py-2.5 text-right">{t("col24h")}</th>
              <th className="px-3 py-2.5 text-center">{t("colRsi")}</th>
              <th className="px-3 py-2.5 text-center">{t("colMacd")}</th>
              <th className="px-3 py-2.5 text-center">{t("colTrend")}</th>
              <th className="px-3 py-2.5 text-center">{t("colSignal")}</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filtered.map((pair) => {
              const signal = getSignal(pair);
              return (
                <tr key={pair.symbol} className="hover:bg-muted/20 transition">
                  <td className="px-3 py-2.5">
                    <div>
                      <span className="font-mono font-semibold text-foreground">{pair.symbol}</span>
                      <span className="ml-1.5 text-xs text-muted-foreground">{pair.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-foreground">
                    {pair.price.toFixed(pair.price > 100 ? 1 : 4)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={cn("font-mono text-xs", pair.changePercent24h >= 0 ? "text-green-500" : "text-red-500")}>
                      {pair.changePercent24h >= 0 ? "+" : ""}{pair.changePercent24h.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={cn("font-mono text-xs font-medium", getRsiColor(pair.rsi))}>
                      {pair.rsi.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={cn("font-mono text-xs", pair.macd >= 0 ? "text-green-500" : "text-red-500")}>
                      {pair.macd >= 0 ? "+" : ""}{pair.macd.toFixed(3)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {pair.ema20 > pair.ema50 ? (
                      <TrendingUp className="mx-auto size-4 text-green-500" />
                    ) : pair.ema20 < pair.ema50 ? (
                      <TrendingDown className="mx-auto size-4 text-red-500" />
                    ) : (
                      <Minus className="mx-auto size-4 text-muted-foreground" />
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Badge
                      variant={signal === "bull" ? "default" : signal === "bear" ? "destructive" : "outline"}
                      className="text-[10px]"
                    >
                      {signal === "bull" ? "BULL" : signal === "bear" ? "BEAR" : "NEUTRAL"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Link
                      href={`/chart?symbol=${pair.symbol}`}
                      className="text-xs text-primary hover:underline"
                    >
                      {t("viewChart")}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="rounded-lg border border-dashed border-border/80 bg-muted/15 px-4 py-8 text-center">
          <Filter className="mx-auto mb-2 size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("noResults")}</p>
        </div>
      )}
    </div>
  );
}
