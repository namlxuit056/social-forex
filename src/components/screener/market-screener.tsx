"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Filter, ChevronUp, ChevronDown, ChevronsUpDown, Star, Columns3 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { AiPicksPanel } from "@/components/screener/ai-picks-panel";
import { ScreenerFilterBuilder } from "@/components/screener/screener-filter-builder";
import type { CustomFilters } from "@/components/screener/screener-filter-builder";
import { ScreenerAlerts } from "@/components/screener/screener-alerts";

type ScreenerFilter = "all" | "bullish" | "bearish" | "oversold" | "overbought" | "favorites";

type SortColumn =
  | "symbol"
  | "price"
  | "changePercent"
  | "rsi"
  | "adx"
  | "macd"
  | "stochK"
  | "atr"
  | "recM15"
  | "recH1"
  | "recH4"
  | "recD1";

type SortDir = "asc" | "desc";

function SortIcon({ col, sortBy, sortDir }: { col: SortColumn; sortBy: SortColumn | null; sortDir: SortDir }) {
  if (sortBy !== col)
    return <ChevronsUpDown className="ml-1 inline size-3 opacity-30 group-hover:opacity-60" />;
  return sortDir === "asc"
    ? <ChevronUp className="ml-1 inline size-3 text-primary" />
    : <ChevronDown className="ml-1 inline size-3 text-primary" />;
}

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
  macd: number | null;
  macdSignal: number | null;
  bbUpper: number | null;
  bbMiddle: number | null;
  bbLower: number | null;
  bbPosition: "above" | "below" | "within" | "unknown";
  stochK: number | null;
  stochD: number | null;
  stochState: "overbought" | "oversold" | "neutral";
  atr: number | null;
};

type Props = {
  pairs: ScreenerPair[];
  isLoggedIn: boolean;
  isVip: boolean;
  initialFavorites?: string[];
};

const LS_FAVORITES_KEY = "screener_favorites";

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

function BBPositionBadge({ position }: { position: "above" | "below" | "within" | "unknown" }) {
  if (position === "unknown")
    return <span className="text-xs text-muted-foreground/40">—</span>;
  const cfg = {
    above: { label: "Above", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
    below: { label: "Below", cls: "bg-red-500/15 text-red-500" },
    within: { label: "Within", cls: "bg-muted/50 text-muted-foreground" },
  } as const;
  const { label, cls } = cfg[position];
  return (
    <span className={cn("inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold leading-tight whitespace-nowrap", cls)}>
      {label}
    </span>
  );
}

function StochBadge({ value, state }: { value: number | null; state: "overbought" | "oversold" | "neutral" }) {
  if (value === null)
    return <span className="text-xs text-muted-foreground/40">—</span>;
  const cls =
    state === "overbought"
      ? "bg-red-500/15 text-red-500"
      : state === "oversold"
        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
        : "bg-muted/50 text-muted-foreground";
  return (
    <span className={cn("inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold leading-tight whitespace-nowrap tabular-nums", cls)}>
      {value.toFixed(1)}
    </span>
  );
}

function MACDCell({ value, signal }: { value: number | null; signal: number | null }) {
  if (value === null)
    return <span className="text-xs text-muted-foreground/40">—</span>;
  const bullish = signal !== null ? value > signal : value > 0;
  return (
    <span className={cn("text-xs tabular-nums font-medium", bullish ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
      {value.toFixed(4)}
    </span>
  );
}

export function MarketScreener({ pairs, isLoggedIn, isVip, initialFavorites = [] }: Props) {
  const t = useTranslations("screener");
  const [filter, setFilter] = useState<ScreenerFilter>("all");
  const [customFilters, setCustomFilters] = useState<CustomFilters>({});
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (!isLoggedIn && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(LS_FAVORITES_KEY);
        if (stored) return new Set<string>(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
    return new Set(initialFavorites);
  });

  // ── Sorting state, initialised from URL search params ──
  // ── Column visibility ──
  type ExtraCol = "macd" | "bb" | "stoch" | "atr";
  const [visibleCols, setVisibleCols] = useState<Set<ExtraCol>>(new Set());
  const [showColMenu, setShowColMenu] = useState(false);
  const toggleCol = useCallback((col: ExtraCol) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  }, []);

  const [sortBy, setSortBy] = useState<SortColumn | null>(() => {
    if (typeof window === "undefined") return null;
    const s = new URLSearchParams(window.location.search).get("sort") as SortColumn | null;
    return s && ["symbol", "price", "changePercent", "rsi", "adx", "macd", "stochK", "atr", "recM15", "recH1", "recH4", "recD1"].includes(s) ? s : null;
  });
  const [sortDir, setSortDir] = useState<SortDir>(() => {
    if (typeof window === "undefined") return "asc";
    const d = new URLSearchParams(window.location.search).get("dir");
    return d === "desc" || d === "asc" ? d : "asc";
  });

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

  const toggleFavorite = useCallback(
    async (symbol: string) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        const isFav = next.has(symbol);

        if (isFav) {
          next.delete(symbol);
        } else {
          next.add(symbol);
        }

        if (isLoggedIn) {
          // Sync to server
          const method = isFav ? "DELETE" : "POST";
          fetch("/api/favorites", {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symbol }),
          }).catch(() => {
            // Revert on error — reload from server
            setFavorites((curr) => {
              const revert = new Set(curr);
              if (isFav) revert.add(symbol);
              else revert.delete(symbol);
              return revert;
            });
          });
        } else {
          // Persist to localStorage for guests
          try {
            localStorage.setItem(LS_FAVORITES_KEY, JSON.stringify([...next]));
          } catch {
            // ignore
          }
        }

        return next;
      });
    },
    [isLoggedIn],
  );

  const filtered = useMemo(() => {
    let list = [...pairs];

    // Apply preset filter
    switch (filter) {
      case "favorites":
        list = list.filter((p) => favorites.has(p.symbol));
        break;
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

    // Apply custom filters
    const cf = customFilters;
    if (cf.rsi) {
      list = list.filter((p) => {
        if (p.rsi === null) return false;
        if (cf.rsi!.operator === "gt") return p.rsi > cf.rsi!.value;
        if (cf.rsi!.operator === "lt") return p.rsi < cf.rsi!.value;
        return p.rsi >= cf.rsi!.value && p.rsi <= (cf.rsi!.max ?? cf.rsi!.value + 20);
      });
    }
    if (cf.adx) {
      list = list.filter((p) => {
        if (p.adx === null) return false;
        if (cf.adx!.operator === "gt") return p.adx > cf.adx!.value;
        if (cf.adx!.operator === "lt") return p.adx < cf.adx!.value;
        return p.adx >= cf.adx!.value && p.adx <= (cf.adx!.max ?? cf.adx!.value + 20);
      });
    }
    if (cf.changePercent) {
      list = list.filter((p) => {
        if (cf.changePercent!.operator === "gt") return p.changePercent > cf.changePercent!.value;
        if (cf.changePercent!.operator === "lt") return p.changePercent < cf.changePercent!.value;
        return (
          p.changePercent >= cf.changePercent!.value &&
          p.changePercent <= (cf.changePercent!.max ?? cf.changePercent!.value + 5)
        );
      });
    }
    if (cf.emaBias && cf.emaBias.selected.length > 0) {
      list = list.filter((p) => cf.emaBias!.selected.includes(p.emaBias));
    }
    if (cf.group && cf.group.selected.length > 0) {
      list = list.filter((p) => cf.group!.selected.includes(p.group));
    }
    const recFields = ["recM15", "recH1", "recH4", "recD1"] as const;
    for (const tf of recFields) {
      const cond = cf[tf];
      if (cond && cond.selected.length > 0) {
        list = list.filter((p) => {
          const val = p[tf];
          if (val === null) return false;
          return cond.selected.some((threshold) => {
            const t = Number(threshold);
            return t >= 0 ? val >= t : val <= t;
          });
        });
      }
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
          case "macd":
            return cmpNum(a.macd, b.macd, dir);
          case "stochK":
            return cmpNum(a.stochK, b.stochK, dir);
          case "atr":
            return cmpNum(a.atr, b.atr, dir);
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
  }, [pairs, filter, sortBy, sortDir, favorites, customFilters]);

  const filters: { key: ScreenerFilter; label: string; count?: number }[] = [
    { key: "all", label: t("filterAll") },
    { key: "favorites", label: t("filterFavorites"), count: favorites.size },
    { key: "bullish", label: t("filterBullish") },
    { key: "bearish", label: t("filterBearish") },
    { key: "oversold", label: t("filterOversold") },
    { key: "overbought", label: t("filterOverbought") },
  ];

  return (
    <div className="space-y-4">
      <AiPicksPanel isLoggedIn={isLoggedIn} isVip={isVip} />

      {isLoggedIn && <ScreenerAlerts />}

      <ScreenerFilterBuilder
        totalPairs={pairs.length}
        matchedPairs={filtered.length}
        onApply={setCustomFilters}
        activeFilters={customFilters}
      />

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
            {f.count !== undefined && f.count > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary">
                {f.count}
              </span>
            )}
          </button>
        ))}

        {/* Column visibility toggle */}
        <div className="relative ml-auto">
          <button
            onClick={() => setShowColMenu((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition",
              showColMenu ? "bg-primary/15 text-primary" : "bg-muted/30 text-muted-foreground hover:text-foreground",
            )}
          >
            <Columns3 className="size-3.5" />
            {t("columns")}
          </button>
          {showColMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowColMenu(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-border/70 bg-popover p-1.5 shadow-lg">
              {([
                { key: "macd" as const, label: "MACD" },
                { key: "bb" as const, label: t("colBB") },
                { key: "stoch" as const, label: t("colStoch") },
                { key: "atr" as const, label: "ATR" },
              ]).map((col) => (
                <label
                  key={col.key}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={visibleCols.has(col.key)}
                    onChange={() => toggleCol(col.key)}
                    className="size-3.5 rounded border-border accent-primary"
                  />
                  {col.label}
                </label>
              ))}
            </div>
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border/70">
        <table className="w-full min-w-205 text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="w-10 px-2 py-2.5 text-center">
                <Star className="inline size-3.5 text-amber-500" fill="currentColor" />
              </th>
              <th
                className="group cursor-pointer select-none px-3 py-2.5"
                onClick={() => handleSort("symbol")}
              >
                {t("colSymbol")}
                <SortIcon col="symbol" sortBy={sortBy} sortDir={sortDir} />
              </th>
              <th
                className="group cursor-pointer select-none px-3 py-2.5 text-right"
                onClick={() => handleSort("price")}
              >
                {t("colPrice")}
                <SortIcon col="price" sortBy={sortBy} sortDir={sortDir} />
              </th>
              <th
                className="group cursor-pointer select-none px-3 py-2.5 text-right"
                onClick={() => handleSort("changePercent")}
              >
                {t("col24h")}
                <SortIcon col="changePercent" sortBy={sortBy} sortDir={sortDir} />
              </th>
              <th
                className="group cursor-pointer select-none px-3 py-2.5 text-center"
                onClick={() => handleSort("rsi")}
              >
                {t("colRsi")}
                <SortIcon col="rsi" sortBy={sortBy} sortDir={sortDir} />
              </th>
              <th
                className="group cursor-pointer select-none px-3 py-2.5 text-center"
                onClick={() => handleSort("adx")}
              >
                {t("colAdx")}
                <SortIcon col="adx" sortBy={sortBy} sortDir={sortDir} />
              </th>
              {visibleCols.has("macd") && (
                <th
                  className="group cursor-pointer select-none px-3 py-2.5 text-center text-xs"
                  onClick={() => handleSort("macd")}
                >
                  MACD <SortIcon col="macd" sortBy={sortBy} sortDir={sortDir} />
                </th>
              )}
              {visibleCols.has("bb") && (
                <th className="px-3 py-2.5 text-center text-xs">
                  {t("colBB")}
                </th>
              )}
              {visibleCols.has("stoch") && (
                <th
                  className="group cursor-pointer select-none px-3 py-2.5 text-center text-xs"
                  onClick={() => handleSort("stochK")}
                >
                  {t("colStoch")} <SortIcon col="stochK" sortBy={sortBy} sortDir={sortDir} />
                </th>
              )}
              {visibleCols.has("atr") && (
                <th
                  className="group cursor-pointer select-none px-3 py-2.5 text-center text-xs"
                  onClick={() => handleSort("atr")}
                >
                  ATR <SortIcon col="atr" sortBy={sortBy} sortDir={sortDir} />
                </th>
              )}
              <th
                className="group cursor-pointer select-none px-3 py-2.5 text-center text-xs"
                onClick={() => handleSort("recM15")}
              >
                M15 <SortIcon col="recM15" sortBy={sortBy} sortDir={sortDir} />
              </th>
              <th
                className="group cursor-pointer select-none px-3 py-2.5 text-center text-xs"
                onClick={() => handleSort("recH1")}
              >
                H1 <SortIcon col="recH1" sortBy={sortBy} sortDir={sortDir} />
              </th>
              <th
                className="group cursor-pointer select-none px-3 py-2.5 text-center text-xs"
                onClick={() => handleSort("recH4")}
              >
                H4 <SortIcon col="recH4" sortBy={sortBy} sortDir={sortDir} />
              </th>
              <th
                className="group cursor-pointer select-none px-3 py-2.5 text-center text-xs"
                onClick={() => handleSort("recD1")}
              >
                D1 <SortIcon col="recD1" sortBy={sortBy} sortDir={sortDir} />
              </th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filtered.map((pair) => {
              const isFav = favorites.has(pair.symbol);
              return (
              <tr key={pair.symbol} className="hover:bg-muted/20 transition">
                <td className="w-10 px-2 py-2.5 text-center">
                  <button
                    onClick={() => toggleFavorite(pair.symbol)}
                    className="group/star inline-flex items-center justify-center transition-transform hover:scale-110"
                    aria-label={isFav ? t("removeFromFavorites") : t("addToFavorites")}
                  >
                    <Star
                      className={cn(
                        "size-4 transition-colors",
                        isFav
                          ? "fill-amber-400 text-amber-500"
                          : "text-muted-foreground/30 group-hover/star:text-amber-400",
                      )}
                    />
                  </button>
                </td>
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
                {visibleCols.has("macd") && (
                  <td className="px-3 py-2.5 text-center">
                    <MACDCell value={pair.macd} signal={pair.macdSignal} />
                  </td>
                )}
                {visibleCols.has("bb") && (
                  <td className="px-3 py-2.5 text-center">
                    <BBPositionBadge position={pair.bbPosition} />
                  </td>
                )}
                {visibleCols.has("stoch") && (
                  <td className="px-3 py-2.5 text-center">
                    <StochBadge value={pair.stochK} state={pair.stochState} />
                  </td>
                )}
                {visibleCols.has("atr") && (
                  <td className="px-3 py-2.5 text-center">
                    {pair.atr !== null ? (
                      <span className="text-xs tabular-nums font-mono text-muted-foreground">
                        {pair.atr.toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </td>
                )}
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

      <p className="text-xs text-muted-foreground/60">
        {t("dataSource")}
      </p>
    </div>
  );
}
