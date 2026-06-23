"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Filter } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type ScreenerFilter = "all" | "bullish" | "bearish" | "oversold" | "overbought";

type ScreenerPair = {
  symbol: string;
  name: string;
  group: string;
  price: number;
  changePercent: number;
  rsi: number | null;
  adx: number | null;
  emaBias: "bullish" | "bearish" | "mixed" | "unknown";
  recM15: number | null;
  recH1: number | null;
  recH4: number | null;
  recD1: number | null;
};

type Props = {
  pairs: ScreenerPair[];
};

type RecLabel = "STRONG BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG SELL";

function toRecLabel(v: number | null): RecLabel | null {
  if (v === null) return null;
  if (v >= 0.5) return "STRONG BUY";
  if (v >= 0.1) return "BUY";
  if (v > -0.1) return "NEUTRAL";
  if (v > -0.5) return "SELL";
  return "STRONG SELL";
}

function RecBadge({ value }: { value: number | null }) {
  const label = toRecLabel(value);
  if (label === null)
    return <span className="text-xs text-muted-foreground/40">—</span>;

  const cls: Record<RecLabel, string> = {
    "STRONG BUY": "bg-emerald-600 text-white",
    BUY: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    NEUTRAL: "bg-muted/50 text-muted-foreground",
    SELL: "bg-red-500/15 text-red-500",
    "STRONG SELL": "bg-red-600 text-white",
  };

  return (
    <span
      className={cn(
        "inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold leading-tight whitespace-nowrap",
        cls[label],
      )}
    >
      {label}
    </span>
  );
}

function priceDecimals(price: number): number {
  if (price >= 10_000) return 1;
  if (price >= 100) return 2;
  if (price >= 10) return 3;
  return 4;
}

export function MarketScreener({ pairs }: Props) {
  const t = useTranslations("screener");
  const [filter, setFilter] = useState<ScreenerFilter>("all");

  const filtered = useMemo(() => {
    switch (filter) {
      case "bullish":
        return pairs.filter((p) => p.recD1 !== null && p.recD1 >= 0.1);
      case "bearish":
        return pairs.filter((p) => p.recD1 !== null && p.recD1 <= -0.1);
      case "oversold":
        return pairs.filter((p) => p.rsi !== null && p.rsi < 35);
      case "overbought":
        return pairs.filter((p) => p.rsi !== null && p.rsi > 65);
      default:
        return pairs;
    }
  }, [pairs, filter]);

  const filters: { key: ScreenerFilter; label: string }[] = [
    { key: "all", label: t("filterAll") },
    { key: "bullish", label: t("filterBullish") },
    { key: "bearish", label: t("filterBearish") },
    { key: "oversold", label: t("filterOversold") },
    { key: "overbought", label: t("filterOverbought") },
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
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5">{t("colSymbol")}</th>
              <th className="px-3 py-2.5 text-right">{t("colPrice")}</th>
              <th className="px-3 py-2.5 text-right">{t("col24h")}</th>
              <th className="px-3 py-2.5 text-center">{t("colRsi")}</th>
              <th className="px-3 py-2.5 text-center">{t("colAdx")}</th>
              <th className="px-3 py-2.5 text-center text-xs">M15</th>
              <th className="px-3 py-2.5 text-center text-xs">H1</th>
              <th className="px-3 py-2.5 text-center text-xs">H4</th>
              <th className="px-3 py-2.5 text-center text-xs">D1</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filtered.map((pair) => (
              <tr key={pair.symbol} className="hover:bg-muted/20 transition">
                <td className="px-3 py-2.5">
                  <span className="font-mono font-semibold text-foreground">
                    {pair.symbol}
                  </span>
                  <span className="ml-1.5 text-xs text-muted-foreground hidden sm:inline">
                    {pair.name}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-foreground">
                  {(pair.price ?? 0).toFixed(priceDecimals(pair.price ?? 0))}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span
                    className={cn(
                      "font-mono text-xs",
                      (pair.changePercent ?? 0) >= 0
                        ? "text-emerald-500"
                        : "text-red-500",
                    )}
                  >
                    {(pair.changePercent ?? 0) >= 0 ? "+" : ""}
                    {(pair.changePercent ?? 0).toFixed(2)}%
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center">
                  {pair.rsi !== null ? (
                    <span
                      className={cn(
                        "font-mono text-xs font-medium",
                        pair.rsi > 70
                          ? "text-red-500"
                          : pair.rsi < 30
                            ? "text-emerald-500"
                            : "text-muted-foreground",
                      )}
                    >
                      {pair.rsi.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {pair.adx !== null ? (
                    <span
                      className={cn(
                        "font-mono text-xs",
                        pair.adx > 25
                          ? "text-foreground font-medium"
                          : "text-muted-foreground",
                      )}
                    >
                      {pair.adx.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <RecBadge value={pair.recM15} />
                </td>
                <td className="px-3 py-2.5 text-center">
                  <RecBadge value={pair.recH1} />
                </td>
                <td className="px-3 py-2.5 text-center">
                  <RecBadge value={pair.recH4} />
                </td>
                <td className="px-3 py-2.5 text-center">
                  <RecBadge value={pair.recD1} />
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
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="rounded-lg border border-dashed border-border/80 bg-muted/15 px-4 py-8 text-center">
          <Filter className="mx-auto mb-2 size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("noResults")}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground/60">
        {t("dataSource")}
      </p>
    </div>
  );
}
