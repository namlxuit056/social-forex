"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Filter, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { AiPicksPanel } from "@/components/screener/ai-picks-panel";

type ScreenerFilter = "all" | "bullish" | "bearish" | "oversold" | "overbought";

type SortColumn =
  | "symbol"
  | "price"
  | "changePercent"
  | "rsi"
  | "adx"
  | "recM15"
  | "recH1"
  | "recH4"
  | "recD1";

type SortDir = "asc" | "desc";

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
  isLoggedIn: boolean;
  isVip: boolean;
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

/** Compare two nullable numbers: null always sorts last. */
function cmpNum(a: number | null, b: number | null, dir: number): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1; // null last
  if (b === null) return -1;
  return (a - b) * dir;
}

function cmpStr(a: string, b: string, dir: number): number {
  return a.localeCompare(b) * dir;
}

export function MarketScreener({ pairs, isLoggedIn, isVip }: Props) {
  const t = useTranslations("screener");
  const [filter, setFilter] = useState<ScreenerFilter>("all");

  // ── Sorting state, initialised from URL search params ──
  const [sortBy, setSortBy] = useState<SortColumn | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Read initial sort from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("sort") as SortColumn | null;
    const d = params.get("dir");
    if (s && ["symbol", "price", "changePercent", "rsi", "adx", "recM15", "recH1", "recH4", "recD1"].includes(s)) {
      setSortBy(s);
    }
    if (d === "desc" || d === "asc") {
      setSortDir(d);
    }
  }, []);

  // Persist sort to URL
  useEffect(() => {
    const url = new URL(window.location.href);
    if (sortBy) {
      url.searchParams.set("sort", sortBy);
      url.searchParams.set("dir", sortDir);
    } else {
      url.searchParams.delete("sort");
      url.searchParams.delete("dir");
    }
    window.history.replaceState(null, "", url.toString());
  }, [sortBy, sortDir]);

  const handleSort = useCallback(
    (col: SortColumn) => {
      if (sortBy === col) {
        // Toggle: asc → desc → none → asc
        if (sortDir === "asc") {
          setSortDir("desc");
        } else {
          setSortBy(null);
          setSortDir("asc");
        }
      } else {
        setSortBy(col);
        setSortDir("asc");
      }
    },
    [sortBy, sortDir],
  );

  const filtered = useMemo(() => {
    let list = [...pairs];

    // Apply filter
    switch (filter) {
      case "bullish":
        list = list.filter((p) => p.recD1 !== null && p.recD1 >= 0.1);
        break;
      case "bearish":
        list = list.filter((p) => p.recD1 !== null && p.recD1 <= -0.1);
        break;
      case "oversold":
        list = list.filter((p) => p.rsi !== null && p.rsi < 35);
        break;
      case "overbought":
        list = list.filter((p) => p.rsi !== null && p.rsi > 65);
        break;
    }

    // Apply sort
    if (sortBy) {
      const dir = sortDir === "asc" ? 1 : -1;
      list.sort((a, b) => {
        switch (sortBy) {
          case "symbol":
            return cmpStr(a.symbol, b.symbol, dir);
          case "price":
            return cmpNum(a.price, b.price, dir);
          case "changePercent":
            return cmpNum(a.changePercent, b.changePercent, dir);
          case "rsi":
            return cmpNum(a.rsi, b.rsi, dir);
          case "adx":
            return cmpNum(a.adx, b.adx, dir);
          case "recM15":
            return cmpNum(a.recM15, b.recM15, dir);
          case "recH1":
            return cmpNum(a.recH1, b.recH1, dir);
          case "recH4":
            return cmpNum(a.recH4, b.recH4, dir);
          case "recD1":
            return cmpNum(a.recD1, b.recD1, dir);
          default:
            return 0;
        }
      });
    }

    return list;
  }, [pairs, filter, sortBy, sortDir]);

  const filters: { key: ScreenerFilter; label: string }[] = [
    { key: "all", label: t("filterAll") },
    { key: "bullish", label: t("filterBullish") },
    { key: "bearish", label: t("filterBearish") },
    { key: "oversold", label: t("filterOversold") },
    { key: "overbought", label: t("filterOverbought") },
  ];

  /** Render sort icon for a column */
  function SortIcon({ col }: { col: SortColumn }) {
    if (sortBy !== col)
      return (
        <ChevronsUpDown className="ml-1 inline size-3 opacity-30 group-hover:opacity-60" />
      );
    return sortDir === "asc" ? (
      <ChevronUp className="ml-1 inline size-3 text-primary" />
    ) : (
      <ChevronDown className="ml-1 inline size-3 text-primary" />
    );
  }

  return (
    <div className="space-y-4">
      <AiPicksPanel isLoggedIn={isLoggedIn} isVip={isVip} />

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
        <table className="w-full min-w-205 text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th
                className="group cursor-pointer select-none px-3 py-2.5"
                onClick={() => handleSort("symbol")}
              >
                {t("colSymbol")}
                <SortIcon col="symbol" />
              </th>
              <th
                className="group cursor-pointer select-none px-3 py-2.5 text-right"
                onClick={() => handleSort("price")}
              >
                {t("colPrice")}
                <SortIcon col="price" />
              </th>
              <th
                className="group cursor-pointer select-none px-3 py-2.5 text-right"
                onClick={() => handleSort("changePercent")}
              >
                {t("col24h")}
                <SortIcon col="changePercent" />
              </th>
              <th
                className="group cursor-pointer select-none px-3 py-2.5 text-center"
                onClick={() => handleSort("rsi")}
              >
                {t("colRsi")}
                <SortIcon col="rsi" />
              </th>
              <th
                className="group cursor-pointer select-none px-3 py-2.5 text-center"
                onClick={() => handleSort("adx")}
              >
                {t("colAdx")}
                <SortIcon col="adx" />
              </th>
              <th
                className="group cursor-pointer select-none px-3 py-2.5 text-center text-xs"
                onClick={() => handleSort("recM15")}
              >
                M15 <SortIcon col="recM15" />
              </th>
              <th
                className="group cursor-pointer select-none px-3 py-2.5 text-center text-xs"
                onClick={() => handleSort("recH1")}
              >
                H1 <SortIcon col="recH1" />
              </th>
              <th
                className="group cursor-pointer select-none px-3 py-2.5 text-center text-xs"
                onClick={() => handleSort("recH4")}
              >
                H4 <SortIcon col="recH4" />
              </th>
              <th
                className="group cursor-pointer select-none px-3 py-2.5 text-center text-xs"
                onClick={() => handleSort("recD1")}
              >
                D1 <SortIcon col="recD1" />
              </th>
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
