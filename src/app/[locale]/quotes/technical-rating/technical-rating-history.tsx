"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  rollupSummaries,
  type DailySummaryRow,
} from "@/lib/quotes/technical-rating-summary";
import { describeDetail } from "@/lib/quotes/external-signal-format";
import { SIGNAL_SOURCES, type SignalDetail } from "@/lib/quotes/signal-sources";

type RawDetail = {
  kind?: string;
  longPct?: number;
  shortPct?: number;
  heavyZone?: number | null;
  netPct?: number;
  weekChange?: number;
  reportDate?: string;
};

type HistoryItem = {
  id: string;
  createdAt: string;
  readAt: string | null;
  meta: {
    symbol?: string;
    signal?: string;
    source?: string;
    stance?: string;
    score4h?: number;
    score1d?: number;
    entryLow?: number;
    entryHigh?: number;
    stopLoss?: number;
    takeProfit?: number;
    tvAgree?: boolean | null;
    detail?: RawDetail;
  } | null;
};

type Period = "day" | "week" | "month";

function todayUtcStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function toSignalDetail(d: RawDetail | undefined): SignalDetail | null {
  if (!d) return null;
  if (
    d.kind === "crowd" &&
    typeof d.longPct === "number" &&
    typeof d.shortPct === "number"
  ) {
    return {
      kind: "crowd",
      longPct: d.longPct,
      shortPct: d.shortPct,
      heavyZone: d.heavyZone ?? null,
    };
  }
  if (
    d.kind === "cot" &&
    typeof d.netPct === "number" &&
    typeof d.weekChange === "number"
  ) {
    return {
      kind: "cot",
      netPct: d.netPct,
      weekChange: d.weekChange,
      reportDate: d.reportDate ?? "",
    };
  }
  return null;
}

export function TechnicalRatingHistory({
  items,
  dailySummaries,
  locale,
}: {
  items: HistoryItem[];
  dailySummaries: DailySummaryRow[];
  locale: string;
}) {
  const t = useTranslations("quotes");
  const tsRaw = useTranslations("signalSources");
  const ts = (key: string, params?: Record<string, string | number>) =>
    tsRaw(key as Parameters<typeof tsRaw>[0], params as never);
  const [period, setPeriod] = useState<Period>("day");

  const summary = useMemo(() => {
    if (period === "day") {
      const today = dailySummaries.find((d) => d.day === todayUtcStr());
      return today ? rollupSummaries([today]) : null;
    }
    const n = period === "week" ? 7 : 30;
    const rows = dailySummaries.slice(0, n);
    return rows.length > 0 ? rollupSummaries(rows) : null;
  }, [dailySummaries, period]);

  const periodOptions: { value: Period; label: string }[] = [
    { value: "day", label: t("technicalRatingTabDay") },
    { value: "week", label: t("technicalRatingTabWeek") },
    { value: "month", label: t("technicalRatingTabMonth") },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-sm">{t("technicalRatingTitle")}</CardTitle>
            <div className="inline-flex rounded-lg border border-border p-0.5">
              {periodOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPeriod(opt.value)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                    period === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!summary ? (
            <p className="text-sm text-muted-foreground">{t("technicalRatingSummaryEmpty")}</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">{t("technicalRatingTotalSignals")}</p>
                  <p className="mt-1 font-mono text-xl font-bold">{summary.totalSignals}</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">{t("technicalRatingBuySignals")}</p>
                  <p className="mt-1 font-mono text-xl font-bold text-emerald-500">
                    {summary.buySignals}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">{t("technicalRatingSellSignals")}</p>
                  <p className="mt-1 font-mono text-xl font-bold text-red-500">
                    {summary.sellSignals}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground" title={t("technicalRatingHeldHint")}>
                    {t("technicalRatingHeldSignals")}
                  </p>
                  <p className="mt-1 font-mono text-xl font-bold">
                    {summary.heldSignals}
                    <span className="text-sm text-muted-foreground">
                      /{summary.totalSignals}
                    </span>
                  </p>
                </div>
              </div>

              {summary.topSymbols.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                    {t("technicalRatingTopSymbols")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {summary.topSymbols.map((s) => (
                      <span
                        key={s.symbol}
                        className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-foreground/85"
                      >
                        {s.symbol} × {s.count}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("technicalRatingHistoryTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">
              {t("technicalRatingEmpty")}
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {items.map((n) => {
                const meta = n.meta;
                if (!meta?.symbol || !meta.signal) return null;
                const isBuy = meta.signal === "buy";
                const isExternal = !!meta.source && meta.source !== "tradingview";
                const hasLevels =
                  meta.entryLow !== undefined &&
                  meta.entryHigh !== undefined &&
                  meta.stopLoss !== undefined &&
                  meta.takeProfit !== undefined;
                const detail = toSignalDetail(meta.detail);
                return (
                  <li key={n.id} className="flex flex-col gap-1.5 px-4 py-2.5 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-medium text-foreground">
                          {meta.symbol}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            isBuy
                              ? "border-emerald-500/40 bg-emerald-500/12 text-emerald-700 dark:text-emerald-200"
                              : "border-red-500/40 bg-red-500/12 text-red-700 dark:text-red-200",
                          )}
                        >
                          {isBuy ? t("technicalRatingBuy") : t("technicalRatingSell")}
                        </Badge>
                        {isExternal ? (
                          <Badge variant="outline" className="border-border/60 text-muted-foreground">
                            {ts(meta.source as string)}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {!isExternal &&
                        meta.score4h !== undefined &&
                        meta.score1d !== undefined ? (
                          <span className="font-mono">
                            4H {meta.score4h} · 1D {meta.score1d}
                          </span>
                        ) : null}
                        <span>{new Date(n.createdAt).toLocaleString(locale)}</span>
                      </div>
                    </div>
                    {isExternal && detail ? (
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="font-mono">{describeDetail(ts, detail)}</span>
                        <span>
                          ·{" "}
                          {ts(
                            meta.stance === "contrarian"
                              ? "stanceContrarian"
                              : "stanceTrend",
                          )}
                        </span>
                        {meta.tvAgree === true || meta.tvAgree === false ? (
                          <span className={meta.tvAgree ? "text-emerald-500" : "text-amber-500"}>
                            · {ts(meta.tvAgree ? "tvAgree" : "tvDisagree")}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    {!isExternal && hasLevels ? (
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-xs text-muted-foreground">
                        <span>
                          {t("technicalRatingEntryZone")}: {meta.entryLow}–{meta.entryHigh}
                        </span>
                        <span className="text-red-500">
                          {t("technicalRatingStopLoss")}: {meta.stopLoss}
                        </span>
                        <span className="text-emerald-500">
                          {t("technicalRatingTakeProfit")}: {meta.takeProfit}
                        </span>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{ts("legendTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">{ts("legendHint")}</p>
          <ul className="space-y-1.5">
            {SIGNAL_SOURCES.map((s) => (
              <li key={s} className="text-xs">
                <span className="font-medium text-foreground">{ts(s)}</span>
                <span className="text-muted-foreground"> — {ts(`${s}Blurb`)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">{t("technicalRatingScoreHint")}</p>
      <p className="text-xs text-muted-foreground">{t("technicalRatingLevelsHint")}</p>
    </div>
  );
}
