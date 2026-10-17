"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatInTimeZone } from "date-fns-tz";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImpactBadge } from "@/components/ui/status-badge";
import {
  CalendarEventAiAnalysis,
  actionClass,
  biasClass,
} from "@/components/calendar/calendar-event-ai-analysis";
import { computeActualSignal } from "@/lib/calendar/actual-signal";
import { cn } from "@/lib/utils";
import type {
  CalendarEvent,
  CalendarEventStatus,
  CalendarSource,
  Impact,
} from "@/lib/calendar/types";

const LIVE_WINDOW_MS = 90 * 60 * 1000;

function useSyncedNow(serverNowIso: string, intervalMs = 30_000) {
  const [initialServerNowMs] = useState(() => {
    const serverNowMs = new Date(serverNowIso).getTime();
    return Number.isNaN(serverNowMs) ? Date.now() : serverNowMs;
  });
  const [mountedClientNowMs] = useState(() => Date.now());
  const [now, setNow] = useState(initialServerNowMs);

  useEffect(() => {
    const tick = () => {
      setNow(initialServerNowMs + (Date.now() - mountedClientNowMs));
    };
    const id = setInterval(tick, intervalMs);
    tick();
    return () => clearInterval(id);
  }, [initialServerNowMs, intervalMs, mountedClientNowMs]);

  return now;
}

function computeStatus(
  timeUtc: string,
  nowMs: number,
  actual?: string,
): CalendarEventStatus {
  if (actual?.trim()) return "finished";

  const t = new Date(timeUtc).getTime();
  if (Number.isNaN(t)) return "upcoming";
  if (nowMs < t) return "upcoming";
  if (nowMs < t + LIVE_WINDOW_MS) return "live";
  return "finished";
}

type Zone = "utc" | "vn";
type DateRange = "today" | "week";
type StatusFilter = CalendarEventStatus;

type Props = {
  events: CalendarEvent[];
  source: CalendarSource;
  warning?: string;
  syncedAt?: string;
  serverNowIso: string;
  /** Từ URL — set ban đầu; parent nên đổi `key` khi query đổi để reset filter. */
  initialSelectedCurrencies?: string[];
  /** ID sự kiện cần cuộn tới + highlight (từ link "News today" ở /positions). */
  initialHighlightEventId?: string;
};

export function EconomicCalendar({
  events,
  source,
  warning,
  syncedAt,
  serverNowIso,
  initialSelectedCurrencies = [],
  initialHighlightEventId,
}: Props) {
  const t = useTranslations("calendar");
  const intlLocale = useLocale();

  const [zone, setZone] = useState<Zone>("vn");
  // Deep-linked from a highlight: broaden the default filters so the target event
  // is visible regardless of which day/status it falls under.
  const [dateRange, setDateRange] = useState<DateRange>(
    () => (initialHighlightEventId ? "week" : "today"),
  );
  const [selectedStatuses, setSelectedStatuses] = useState<Set<StatusFilter>>(
    () =>
      initialHighlightEventId
        ? new Set(["live", "upcoming", "finished"])
        : new Set(["live", "upcoming"]),
  );
  const [selectedCurrencies, setSelectedCurrencies] = useState<Set<string>>(
    () => new Set(initialSelectedCurrencies),
  );
  const [selectedImpacts, setSelectedImpacts] = useState<Set<Impact>>(
    new Set(["high", "medium", "low"]),
  );
  const [isPending, startTransition] = useTransition();
  const now = useSyncedNow(serverNowIso);
  const highlightRefs = useRef(new Map<string, HTMLElement>());

  const statusText = (s: CalendarEventStatus) =>
    s === "upcoming"
      ? t("statusUpcoming")
      : s === "live"
        ? t("statusLive")
        : t("statusDone");

  const impactBadge = (impact: Impact) => {
    const label =
      impact === "low"
        ? t("impactLow")
        : impact === "medium"
          ? t("impactMedShort")
          : t("impactHigh");
    return <ImpactBadge impact={impact} label={label} />;
  };

  const statusBadgeRow = (s: CalendarEventStatus) => {
    const map = {
      upcoming: "bg-muted text-muted-foreground",
      live: "bg-primary/25 text-primary ring-1 ring-primary/30",
      finished: "bg-muted text-muted-foreground",
    };
    return (
      <span
        className={cn(
          "rounded px-2 py-0.5 text-xs font-medium tabular-nums",
          map[s],
        )}
      >
        {statusText(s)}
      </span>
    );
  };

  const valuesLabel = (ev: CalendarEvent) => (
    <span className="space-x-1.5">
      <span>
        {t("valueForecast")}: {ev.forecast || "—"}
      </span>
      <span className="text-muted-foreground/60">·</span>
      <span>
        {t("valuePrevious")}: {ev.previous || "—"}
      </span>
      <span className="text-muted-foreground/60">·</span>
      <span
        className={cn(
          ev.actual ? "font-semibold text-foreground" : "text-muted-foreground",
        )}
      >
        {t("valueActual")}: {ev.actual || "—"}
      </span>
    </span>
  );

  const signalBlock = (ev: CalendarEvent) => {
    const signal = computeActualSignal(ev);
    if (!signal || signal.bias === "neutral" || signal.pairs.length === 0) return null;
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">
          {t("signalLabel", {
            baseline: t(
              signal.baseline === "forecast"
                ? "signalBaselineForecast"
                : "signalBaselinePrevious",
            ),
          })}
        </span>
        <Badge variant="outline" className={cn("font-mono", biasClass(signal.bias))}>
          {ev.currency} {t(`aiBias.${signal.bias}`)}
        </Badge>
        {signal.pairs
          .filter((p) => p.actionBias !== "neutral")
          .map((p) => (
            <Badge
              key={p.pair}
              variant="outline"
              className={cn("font-mono", actionClass(p.actionBias))}
            >
              {p.pair} {t(`aiAction.${p.actionBias}`)}
            </Badge>
          ))}
      </div>
    );
  };

  const impactOptions = useMemo(
    () =>
      [
        {
          value: "high" as const,
          label: t("impactHigh"),
          color: "bg-destructive/20 text-destructive border-destructive/30",
        },
        {
          value: "medium" as const,
          label: t("impactMedShort"),
          color: "bg-amber-500/15 text-amber-700 dark:text-amber-200/95 border-amber-500/30",
        },
        {
          value: "low" as const,
          label: t("impactLow"),
          color: "bg-muted text-muted-foreground border-border",
        },
      ] as const,
    [t],
  );

  const statusOptions = useMemo(
    () =>
      [
        {
          value: "live" as const,
          label: t("statusLive"),
          color: "border-primary/30 bg-primary/15 text-primary",
        },
        {
          value: "upcoming" as const,
          label: t("statusUpcoming"),
          color: "border-sky-400/30 bg-sky-400/10 text-sky-700 dark:text-sky-200",
        },
        {
          value: "finished" as const,
          label: t("statusDone"),
          color: "border-border bg-muted text-muted-foreground",
        },
      ] as const,
    [t],
  );

  const sorted = useMemo(
    () =>
      [...events].sort(
        (a, b) =>
          new Date(a.timeUtc).getTime() - new Date(b.timeUtc).getTime(),
      ),
    [events],
  );

  const currencies = useMemo(() => {
    const set = new Set(sorted.map((ev) => ev.currency));
    return Array.from(set).sort();
  }, [sorted]);

  const todayStr = useMemo(() => {
    const tz = zone === "utc" ? "UTC" : "Asia/Ho_Chi_Minh";
    return formatInTimeZone(new Date(now), tz, "yyyy-MM-dd");
  }, [now, zone]);

  const filtered = useMemo(() => {
    const tz = zone === "utc" ? "UTC" : "Asia/Ho_Chi_Minh";
    return sorted.filter((ev) => {
      if (!selectedImpacts.has(ev.impact)) return false;

      if (selectedCurrencies.size > 0 && !selectedCurrencies.has(ev.currency))
        return false;

      if (dateRange === "today") {
        const evDay = formatInTimeZone(new Date(ev.timeUtc), tz, "yyyy-MM-dd");
        if (evDay !== todayStr) return false;
      }

      return true;
    });
  }, [sorted, selectedImpacts, selectedCurrencies, dateRange, todayStr, zone]);

  const rows = useMemo(
    () =>
      filtered
        .map((ev) => ({
          ev,
          status: computeStatus(ev.timeUtc, now, ev.actual),
        }))
        .filter(({ status }) => selectedStatuses.has(status)),
    [filtered, now, selectedStatuses],
  );

  useEffect(() => {
    if (!initialHighlightEventId) return;
    const el = highlightRefs.current.get(initialHighlightEventId);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [initialHighlightEventId, rows]);

  function setHighlightRef(id: string, el: HTMLElement | null) {
    if (el) highlightRefs.current.set(id, el);
    else highlightRefs.current.delete(id);
  }

  const tz = zone === "utc" ? "UTC" : "Asia/Ho_Chi_Minh";
  const zoneLabel = zone === "utc" ? t("zoneUtc") : t("zoneVn");

  const sourceLabel =
    source === "investing"
      ? t("sourceInvesting")
      : source === "fmp"
        ? t("sourceFmp")
        : source === "stale_db"
          ? t("sourceStaleDb")
          : t("sourceSample");

  function toggleCurrency(c: string) {
    setSelectedCurrencies((prev) => {
      const next = new Set(prev);
      if (next.has(c)) {
        next.delete(c);
      } else {
        next.add(c);
      }
      return next;
    });
  }

  function toggleImpact(impact: Impact) {
    setSelectedImpacts((prev) => {
      const next = new Set(prev);
      if (next.has(impact)) {
        if (next.size > 1) next.delete(impact);
      } else {
        next.add(impact);
      }
      return next;
    });
  }

  function toggleStatus(status: StatusFilter) {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        if (next.size > 1) next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {/* Source + Sync info */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-md bg-muted/80 px-2 py-0.5 font-mono text-[10px] text-foreground/80">
          {t("labelSource")} {sourceLabel}
        </span>
        {syncedAt && (
          <span>
            {t("labelSynced")}{" "}
            {new Date(syncedAt).toLocaleString(
              intlLocale === "vi" ? "vi-VN" : "en-US",
              {
                timeZone: "Asia/Ho_Chi_Minh",
              },
            )}
          </span>
        )}
      </div>

      {warning ? (
        <p
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-100/90"
          role="status"
        >
          {warning}
        </p>
      ) : null}

      {/* Filters bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 sm:flex-row sm:flex-wrap sm:items-center">
        {/* Date range */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {t("labelDate")}
          </span>
          <div className="inline-flex rounded-lg border border-border p-0.5">
            <Button
              type="button"
              variant={dateRange === "today" ? "default" : "ghost"}
              size="sm"
              className="rounded-md px-3 text-xs"
              onClick={() => setDateRange("today")}
            >
              {t("filterToday")}
            </Button>
            <Button
              type="button"
              variant={dateRange === "week" ? "default" : "ghost"}
              size="sm"
              className="rounded-md px-3 text-xs"
              onClick={() => setDateRange("week")}
            >
              {t("filterWeek")}
            </Button>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden h-6 w-px bg-border sm:block" />

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {t("labelStatus")}
          </span>
          <div className="flex flex-wrap gap-1">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleStatus(opt.value)}
                className={cn(
                  "min-h-9 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all",
                  selectedStatuses.has(opt.value)
                    ? opt.color
                    : "border-transparent bg-muted/40 text-muted-foreground/50",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="hidden h-6 w-px bg-border sm:block" />

        {/* Impact filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {t("labelImpact")}
          </span>
          <div className="flex gap-1">
            {impactOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleImpact(opt.value)}
                className={cn(
                  "min-h-9 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all",
                  selectedImpacts.has(opt.value)
                    ? opt.color
                    : "border-transparent bg-muted/40 text-muted-foreground/50",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="hidden h-6 w-px bg-border sm:block" />

        {/* Currency filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {t("labelCurrency")}
          </span>
          <div className="flex flex-wrap gap-1">
            {currencies.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleCurrency(c)}
                className={cn(
                  "min-h-8 rounded-md border px-2.5 py-1 text-xs font-medium transition-all",
                  selectedCurrencies.size === 0 || selectedCurrencies.has(c)
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-transparent bg-muted/40 text-muted-foreground/50",
                )}
              >
                {c}
              </button>
            ))}
            {selectedCurrencies.size > 0 && (
              <button
                type="button"
                onClick={() => setSelectedCurrencies(new Set())}
                className="min-h-8 rounded-md px-2.5 py-1 text-xs text-muted-foreground/60 underline-offset-2 hover:text-foreground hover:underline"
              >
                {t("allCurrencies")}
              </button>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="hidden h-6 w-px bg-border sm:block" />

        {/* Timezone */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {t("labelTime")}
          </span>
          <div
            className={cn(
              "inline-flex rounded-lg border border-border p-0.5 transition-opacity",
              isPending && "opacity-70",
            )}
          >
            <Button
              type="button"
              variant={zone === "vn" ? "default" : "ghost"}
              size="sm"
              className="rounded-md px-2.5 text-xs"
              onClick={() => startTransition(() => setZone("vn"))}
            >
              VN
            </Button>
            <Button
              type="button"
              variant={zone === "utc" ? "default" : "ghost"}
              size="sm"
              className="rounded-md px-2.5 text-xs"
              onClick={() => startTransition(() => setZone("utc"))}
            >
              UTC
            </Button>
          </div>
          <span className="text-[10px] text-muted-foreground/60">{zoneLabel}</span>
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {t("eventsCount", {
          count: rows.length,
          range: dateRange === "today" ? t("rangeToday") : t("rangeWeek"),
        })}
        {selectedCurrencies.size > 0 &&
          ` · ${Array.from(selectedCurrencies).join(", ")}`}
      </p>

      {/* Mobile cards */}
      <div className="grid gap-2 md:hidden">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/15 px-4 py-8 text-center text-sm text-muted-foreground">
            {t("emptyFilter")}
          </div>
        ) : (
          rows.map(({ ev, status }) => {
            const isHighlighted = ev.id === initialHighlightEventId;
            return (
              <article
                key={ev.id}
                ref={(el) => setHighlightRef(ev.id, el)}
                className={cn(
                  "rounded-xl border border-border bg-card/60 p-3",
                  status === "live" && "border-primary/35 bg-primary/7",
                  isHighlighted && "border-amber-500/60 bg-amber-500/10 ring-1 ring-amber-500/40",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatInTimeZone(new Date(ev.timeUtc), tz, "MMM d HH:mm")}
                      </span>
                      <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-medium text-foreground">
                        {ev.currency}
                      </span>
                    </div>
                    <h3 className="mt-2 text-sm font-medium leading-snug text-foreground">
                      {ev.title}
                    </h3>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {statusBadgeRow(status)}
                    {impactBadge(ev.impact)}
                  </div>
                </div>
                <div className="mt-3 rounded-md bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  {valuesLabel(ev)}
                </div>
                {signalBlock(ev) ? (
                  <div className="mt-2">{signalBlock(ev)}</div>
                ) : null}
                <CalendarEventAiAnalysis event={ev} compact />
              </article>
            );
          })
        )}
      </div>

      {/* Table */}
      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3">{t("tableTime")}</th>
              <th className="px-4 py-3">{t("tableStatus")}</th>
              <th className="px-4 py-3">{t("tableCurrency")}</th>
              <th className="px-4 py-3">{t("tableEvent")}</th>
              <th className="px-4 py-3">{t("tableImpact")}</th>
              <th className="px-4 py-3">{t("tableValues")}</th>
              <th className="px-4 py-3">{t("tableAi")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {t("emptyFilter")}
                </td>
              </tr>
            ) : (
              rows.map(({ ev, status }) => (
                <tr
                  key={ev.id}
                  ref={(el) => setHighlightRef(ev.id, el)}
                  className={cn(
                    "hover:bg-muted/30",
                    status === "live" && "bg-primary/6",
                    ev.id === initialHighlightEventId && "bg-amber-500/10 ring-2 ring-inset ring-amber-500/50",
                  )}
                >
                  <td className="px-4 py-3 font-mono text-foreground/90">
                    {formatInTimeZone(
                      new Date(ev.timeUtc),
                      tz,
                      "yyyy-MM-dd HH:mm",
                    )}
                  </td>
                  <td className="px-4 py-3">{statusBadgeRow(status)}</td>
                  <td className="px-4 py-3 font-medium">{ev.currency}</td>
                  <td className="px-4 py-3">{ev.title}</td>
                  <td className="px-4 py-3">{impactBadge(ev.impact)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {valuesLabel(ev)}
                  </td>
                  <td className="min-w-80 px-4 py-3 align-top">
                    <div className="space-y-2">
                      {signalBlock(ev)}
                      <CalendarEventAiAnalysis event={ev} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
