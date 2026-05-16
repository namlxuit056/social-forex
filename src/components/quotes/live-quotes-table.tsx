"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  AlertCircle,
  Calendar,
  LineChart,
  Loader2,
  Radio,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useFavorites } from "@/hooks/use-favorites";
import type {
  QuoteRow,
  QuotesSource,
  QuotesWarningKey,
} from "@/lib/quotes/types";
import { sortQuoteRowsByFavorites } from "@/lib/quotes/sort-by-favorites";
import { symbolToCurrencies } from "@/lib/signals/symbol-currencies";
import { cn } from "@/lib/utils";

type Props = {
  initial: QuoteRow[];
  initialSource?: QuotesSource;
  initialWarning?: string;
  initialUpdatedAt?: string;
};

type PollPayload = {
  updatedAt: string;
  quotes: QuoteRow[];
  source?: QuotesSource;
  warningKey?: QuotesWarningKey;
  warningParams?: { source: string; message: string };
  error?: string;
};

type AiTrendPayload = {
  symbol: string;
  trend?: AiTrendResult;
  error?: string;
};

type AiTrendResult = {
  direction: "UP" | "DOWN";
  confidence: number;
  summary: string;
  invalidation: string;
};

type TrendState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; payload: AiTrendResult }
  | { status: "error"; message: string };

const TREND_REFRESH_MS = 60 * 60 * 1000;

function formatWarning(
  t: (key: string, values?: Record<string, string>) => string,
  key?: QuotesWarningKey,
  params?: { source: string; message: string },
): string | undefined {
  if (!key) return undefined;
  if (key === "mockData") return t("warningMock");
  if (key === "providerFallback" && params) {
    return t("warningFallback", params);
  }
  return undefined;
}

function calendarHrefForSymbol(symbol: string): string {
  const cur = symbolToCurrencies(symbol);
  if (cur.length === 0) return "/calendar";
  return `/calendar?currencies=${cur.map(encodeURIComponent).join(",")}`;
}

export function LiveQuotesTable({
  initial,
  initialSource,
  initialWarning,
  initialUpdatedAt,
}: Props) {
  const t = useTranslations("quotes");
  const tChart = useTranslations("chart");
  const intlLocale = useLocale();
  const { data: session } = useSession();
  const { favorites, isFavorite, toggle, loaded: favoritesLoaded } =
    useFavorites();

  const [rows, setRows] = useState(initial);
  const [updatedAt, setUpdatedAt] = useState<string | null>(
    initialUpdatedAt ?? null,
  );
  const [source, setSource] = useState<QuotesSource | undefined>(initialSource);
  const [warning, setWarning] = useState<string | undefined>(initialWarning);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [trendBySymbol, setTrendBySymbol] = useState<Record<string, TrendState>>({});
  const trendSymbolsKey = useMemo(
    () => Array.from(new Set(rows.map((row) => row.symbol))).sort().join(","),
    [rows],
  );

  const applyPayload = useCallback(
    (data: PollPayload) => {
      if (data.error) {
        setFetchError(data.error);
        return;
      }
      setFetchError(null);
      if (Array.isArray(data.quotes) && data.quotes.length > 0) {
        setRows(data.quotes);
      }
      setUpdatedAt(data.updatedAt);
      setSource(data.source);
      setWarning(formatWarning(t, data.warningKey, data.warningParams));
    },
    [t],
  );

  useEffect(() => {
    const poll = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/quotes");
        const data = (await res.json()) as PollPayload;
        if (!res.ok) {
          setFetchError(data.error ?? `HTTP ${res.status}`);
          return;
        }
        applyPayload(data);
      } catch (e) {
        setFetchError(
          e instanceof Error ? e.message : t("networkError"),
        );
      } finally {
        setLoading(false);
      }
    };

    const id = setInterval(poll, 15_000);
    return () => clearInterval(id);
  }, [applyPayload, t]);

  const groups = ["major", "minor", "metal", "energy", "crypto"] as const;

  const sourceLabel =
    source === "tradingview"
      ? t("sourceTradingView")
      : source === "massive"
      ? t("sourceMassive")
      : source === "yahoo"
        ? t("sourceYahoo")
        : source === "mock"
          ? t("sourceMock")
          : source === "mock_fallback"
            ? t("sourceMockFallback")
            : "—";

  const dateLocale = intlLocale === "vi" ? "vi-VN" : "en-US";

  const handlePin = useCallback(
    (symbol: string) => {
      if (!session?.user) {
        window.alert(tChart("loginToSave"));
        return;
      }
      toggle(symbol);
    },
    [session?.user, tChart, toggle],
  );

  const requestTrend = useCallback(
    async (symbol: string) => {
      setTrendBySymbol((prev) => ({
        ...prev,
        [symbol]: { status: "loading" },
      }));

      try {
        const res = await fetch("/api/ai/trend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol }),
        });
        const data = (await res.json()) as AiTrendPayload;
        const trend = data.trend;
        if (!res.ok || !trend) {
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        setTrendBySymbol((prev) => ({
          ...prev,
          [symbol]: { status: "ready", payload: trend },
        }));
      } catch (e) {
        setTrendBySymbol((prev) => ({
          ...prev,
          [symbol]: {
            status: "error",
            message: e instanceof Error ? e.message : t("aiTrendError"),
          },
        }));
      }
    },
    [t],
  );

  useEffect(() => {
    const symbols = trendSymbolsKey.split(",").filter(Boolean);
    if (symbols.length === 0) return;

    let cancelled = false;

    const loadTrends = async () => {
      for (const symbol of symbols) {
        if (cancelled) return;
        await requestTrend(symbol);
      }
    };

    void loadTrends();
    const id = setInterval(loadTrends, TREND_REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [requestTrend, trendSymbolsKey]);

  function renderTrend(symbol: string, compact = false) {
    const state = trendBySymbol[symbol] ?? { status: "idle" };
    if (state.status === "ready") {
      const isUp = state.payload.direction === "UP";
      const Icon = isUp ? TrendingUp : TrendingDown;

      return (
        <div className={cn("space-y-1", compact ? "w-full" : "max-w-72")}>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
              isUp
                ? "bg-primary/12 text-primary"
                : "bg-destructive/12 text-destructive",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {isUp ? t("aiTrendUp") : t("aiTrendDown")}
            <span className="text-foreground/60">
              {state.payload.confidence}/5
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {state.payload.summary}
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground/80">
            {t("aiTrendInvalidation")} {state.payload.invalidation}
          </p>
        </div>
      );
    }

    if (state.status === "error") {
      return (
        <div className={cn("space-y-1", compact ? "w-full" : "max-w-64")}>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => requestTrend(symbol)}
          >
            <Sparkles className="size-3.5" aria-hidden />
            {t("aiTrendRetry")}
          </Button>
          <p className="line-clamp-2 text-xs text-destructive">
            {state.message}
          </p>
        </div>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        {t("aiTrendLoading")}
      </span>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {loading && (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            {t("refreshing")}
          </span>
        )}
        {updatedAt && (
          <span>
            {t("updated")}{" "}
            {new Date(updatedAt).toLocaleString(dateLocale, {
              timeZone: "Asia/Ho_Chi_Minh",
            })}{" "}
            {t("timezoneNote", { tz: "VN" })}
          </span>
        )}
        <span className="rounded-md bg-muted/80 px-2 py-0.5 font-mono text-[10px] text-foreground/80">
          {t("labelSource")} {sourceLabel}
        </span>
      </div>

      {(warning || fetchError) && (
        <div
          className={cn(
            "flex gap-2 rounded-lg border px-3 py-2 text-sm",
            fetchError
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-amber-500/30 bg-amber-500/10 text-amber-100/90",
          )}
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>{fetchError ?? warning}</p>
        </div>
      )}

      {favoritesLoaded && favorites.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("watchlistPinnedHint")}
        </p>
      ) : null}

      <div className="space-y-6">
        {groups.map((g) => {
          const subset = sortQuoteRowsByFavorites(
            rows.filter((r) => r.group === g),
            favorites,
          );
          if (!subset.length) return null;
          const label =
            g === "major"
              ? t("groupMajor")
              : g === "minor"
                ? t("groupMinor")
                : g === "metal"
                  ? t("groupMetal")
                  : g === "energy"
                    ? t("groupEnergy")
                    : t("groupCrypto");
          return (
            <section key={g}>
              <h3 className="mb-2 text-sm font-medium text-primary">{label}</h3>
              <div className="grid gap-2 md:hidden">
                {subset.map((r) => (
                  <article
                    key={r.symbol}
                    className={cn(
                      "rounded-lg border border-border bg-card/60 p-3 shadow-xs",
                      isFavorite(r.symbol) && "border-primary/30 bg-primary/7",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-semibold text-foreground">
                            {r.symbol}
                          </span>
                          {isFavorite(r.symbol) ? (
                            <Star
                              className="size-3.5 text-amber-400"
                              fill="currentColor"
                              aria-hidden
                            />
                          ) : null}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {r.name}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-md px-2 py-1 font-mono text-xs font-medium",
                          r.changePct >= 0
                            ? "bg-primary/12 text-primary"
                            : "bg-destructive/12 text-destructive",
                        )}
                      >
                        {r.changePct >= 0 ? "+" : ""}
                        {r.changePct}%
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-md bg-muted/35 px-3 py-2">
                        <p className="text-[10px] uppercase text-muted-foreground">
                          {t("colBid")}
                        </p>
                        <p className="mt-0.5 font-mono text-sm font-medium text-primary">
                          {r.bid}
                        </p>
                      </div>
                      <div className="rounded-md bg-muted/35 px-3 py-2">
                        <p className="text-[10px] uppercase text-muted-foreground">
                          {t("colAsk")}
                        </p>
                        <p className="mt-0.5 font-mono text-sm font-medium text-chart-3">
                          {r.ask}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-md bg-muted/25 px-3 py-2">
                      <p className="mb-2 text-[10px] uppercase text-muted-foreground">
                        {t("colAiTrend")}
                      </p>
                      {renderTrend(r.symbol, true)}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/50 pt-2">
                      <div className="flex items-center gap-0.5">
                        <Link
                          href={`/chart?symbol=${encodeURIComponent(r.symbol)}`}
                          aria-label={t("rowOpenChart", { symbol: r.symbol })}
                          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-8")}
                        >
                          <LineChart className="size-4" />
                        </Link>
                        <Link
                          href={calendarHrefForSymbol(r.symbol)}
                          aria-label={t("rowOpenCalendar", { symbol: r.symbol })}
                          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-8")}
                        >
                          <Calendar className="size-4" />
                        </Link>
                        <Link
                          href={`/signals?symbol=${encodeURIComponent(r.symbol)}`}
                          aria-label={t("rowOpenSignals", { symbol: r.symbol })}
                          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-8")}
                        >
                          <Radio className="size-4" />
                        </Link>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn("size-8", isFavorite(r.symbol) && "text-amber-400")}
                        aria-label={
                          isFavorite(r.symbol)
                            ? t("rowUnpinWatchlist", { symbol: r.symbol })
                            : t("rowPinWatchlist", { symbol: r.symbol })
                        }
                        aria-pressed={isFavorite(r.symbol)}
                        onClick={() => handlePin(r.symbol)}
                      >
                        <Star
                          className="size-4"
                          fill={isFavorite(r.symbol) ? "currentColor" : "none"}
                        />
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
              <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">{t("colPair")}</th>
                      <th className="px-3 py-2 font-medium">{t("colBid")}</th>
                      <th className="px-3 py-2 font-medium">{t("colAsk")}</th>
                      <th className="px-3 py-2 font-medium">{t("colChange")}</th>
                      <th className="px-3 py-2 font-medium">{t("colAiTrend")}</th>
                      <th className="w-px whitespace-nowrap px-2 py-2 text-end font-medium">
                        {t("colActions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {subset.map((r) => (
                      <tr
                        key={r.symbol}
                        className={cn(
                          "hover:bg-muted/40",
                          isFavorite(r.symbol) && "bg-primary/5",
                        )}
                      >
                        <td className="px-3 py-2">
                          <span className="font-mono font-medium text-foreground">
                            {r.symbol}
                          </span>
                          <span className="ml-2 text-muted-foreground">
                            {r.name}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-primary">
                          {r.bid}
                        </td>
                        <td className="px-3 py-2 font-mono text-chart-3">
                          {r.ask}
                        </td>
                        <td
                          className={cn(
                            "px-3 py-2 font-mono",
                            r.changePct >= 0 ? "text-primary" : "text-destructive",
                          )}
                        >
                          {r.changePct >= 0 ? "+" : ""}
                          {r.changePct}%
                        </td>
                        <td className="px-3 py-2 align-top">
                          {renderTrend(r.symbol)}
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center justify-end gap-0.5">
                            <Link
                              href={`/chart?symbol=${encodeURIComponent(r.symbol)}`}
                              aria-label={t("rowOpenChart", { symbol: r.symbol })}
                              className={cn(
                                buttonVariants({
                                  variant: "ghost",
                                  size: "icon",
                                }),
                                "size-8 shrink-0",
                              )}
                            >
                              <LineChart className="size-4" />
                            </Link>
                            <Link
                              href={calendarHrefForSymbol(r.symbol)}
                              aria-label={t("rowOpenCalendar", {
                                symbol: r.symbol,
                              })}
                              className={cn(
                                buttonVariants({
                                  variant: "ghost",
                                  size: "icon",
                                }),
                                "size-8 shrink-0",
                              )}
                            >
                              <Calendar className="size-4" />
                            </Link>
                            <Link
                              href={`/signals?symbol=${encodeURIComponent(r.symbol)}`}
                              aria-label={t("rowOpenSignals", {
                                symbol: r.symbol,
                              })}
                              className={cn(
                                buttonVariants({
                                  variant: "ghost",
                                  size: "icon",
                                }),
                                "size-8 shrink-0",
                              )}
                            >
                              <Radio className="size-4" />
                            </Link>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "size-8 shrink-0",
                                isFavorite(r.symbol) && "text-amber-400",
                              )}
                              aria-label={
                                isFavorite(r.symbol)
                                  ? t("rowUnpinWatchlist", { symbol: r.symbol })
                                  : t("rowPinWatchlist", { symbol: r.symbol })
                              }
                              aria-pressed={isFavorite(r.symbol)}
                              onClick={() => handlePin(r.symbol)}
                            >
                              <Star
                                className="size-4"
                                fill={
                                  isFavorite(r.symbol)
                                    ? "currentColor"
                                    : "none"
                                }
                              />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
