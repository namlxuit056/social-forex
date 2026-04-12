"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  CalendarEvent,
  CalendarEventStatus,
  CalendarSource,
  Impact,
} from "@/lib/calendar/types";

const LIVE_WINDOW_MS = 90 * 60 * 1000;

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function computeStatus(timeUtc: string, nowMs: number): CalendarEventStatus {
  const t = new Date(timeUtc).getTime();
  if (Number.isNaN(t)) return "upcoming";
  if (nowMs < t) return "upcoming";
  if (nowMs < t + LIVE_WINDOW_MS) return "live";
  return "finished";
}

function statusLabel(s: CalendarEventStatus) {
  if (s === "upcoming") return "Sắp diễn ra";
  if (s === "live") return "Đang công bố";
  return "Đã xong";
}

function badge(impact: Impact) {
  const map = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-amber-500/15 text-amber-200/95",
    high: "bg-destructive/20 text-destructive",
  };
  const label = { low: "Thấp", medium: "Trung bình", high: "Cao" };
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${map[impact]}`}>
      {label[impact]}
    </span>
  );
}

function statusBadge(s: CalendarEventStatus) {
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
      {statusLabel(s)}
    </span>
  );
}

type Zone = "utc" | "vn";
type DateRange = "today" | "week";

const IMPACT_OPTIONS: { value: Impact; label: string; color: string }[] = [
  { value: "high", label: "Cao", color: "bg-destructive/20 text-destructive border-destructive/30" },
  { value: "medium", label: "TB", color: "bg-amber-500/15 text-amber-200/95 border-amber-500/30" },
  { value: "low", label: "Thấp", color: "bg-muted text-muted-foreground border-border" },
];

type Props = {
  events: CalendarEvent[];
  source: CalendarSource;
  warning?: string;
  syncedAt?: string;
};

export function EconomicCalendar({
  events,
  source,
  warning,
  syncedAt,
}: Props) {
  const [zone, setZone] = useState<Zone>("vn");
  const [dateRange, setDateRange] = useState<DateRange>("today");
  const [selectedCurrencies, setSelectedCurrencies] = useState<Set<string>>(
    new Set(),
  );
  const [selectedImpacts, setSelectedImpacts] = useState<Set<Impact>>(
    new Set(["high", "medium", "low"]),
  );
  const [isPending, startTransition] = useTransition();
  const now = useNow();

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
    return formatInTimeZone(new Date(), tz, "yyyy-MM-dd");
  }, [zone]);

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
      filtered.map((ev) => ({
        ev,
        status: computeStatus(ev.timeUtc, now),
      })),
    [filtered, now],
  );

  const tz = zone === "utc" ? "UTC" : "Asia/Ho_Chi_Minh";
  const zoneLabel = zone === "utc" ? "UTC" : "Việt Nam (UTC+7)";

  const sourceLabel =
    source === "investing"
      ? "Forex Factory (live)"
      : source === "fmp"
        ? "FMP (cache DB)"
        : source === "stale_db"
          ? "Cache DB (API lỗi)"
          : "Mẫu";

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

  return (
    <div className="space-y-4">
      {/* Source + Sync info */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-md bg-muted/80 px-2 py-0.5 font-mono text-[10px] text-foreground/80">
          Nguồn: {sourceLabel}
        </span>
        {syncedAt && (
          <span>
            Đồng bộ:{" "}
            {new Date(syncedAt).toLocaleString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
            })}
          </span>
        )}
      </div>

      {warning ? (
        <p
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/90"
          role="status"
        >
          {warning}
        </p>
      ) : null}

      {/* Filters bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 sm:flex-row sm:flex-wrap sm:items-center">
        {/* Date range */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Ngày:</span>
          <div className="inline-flex rounded-lg border border-border p-0.5">
            <Button
              type="button"
              variant={dateRange === "today" ? "default" : "ghost"}
              size="sm"
              className="h-7 rounded-md px-3 text-xs"
              onClick={() => setDateRange("today")}
            >
              Hôm nay
            </Button>
            <Button
              type="button"
              variant={dateRange === "week" ? "default" : "ghost"}
              size="sm"
              className="h-7 rounded-md px-3 text-xs"
              onClick={() => setDateRange("week")}
            >
              Cả tuần
            </Button>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden h-6 w-px bg-border sm:block" />

        {/* Impact filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Tác động:</span>
          <div className="flex gap-1">
            {IMPACT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleImpact(opt.value)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-medium transition-all",
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
          <span className="text-xs font-medium text-muted-foreground">Tiền tệ:</span>
          <div className="flex flex-wrap gap-1">
            {currencies.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleCurrency(c)}
                className={cn(
                  "rounded-md border px-2 py-0.5 text-xs font-medium transition-all",
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
                className="rounded-md px-2 py-0.5 text-xs text-muted-foreground/60 underline-offset-2 hover:text-foreground hover:underline"
              >
                Tất cả
              </button>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="hidden h-6 w-px bg-border sm:block" />

        {/* Timezone */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Giờ:</span>
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
              className="h-7 rounded-md px-2.5 text-xs"
              onClick={() => startTransition(() => setZone("vn"))}
            >
              VN
            </Button>
            <Button
              type="button"
              variant={zone === "utc" ? "default" : "ghost"}
              size="sm"
              className="h-7 rounded-md px-2.5 text-xs"
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
        {rows.length} sự kiện
        {dateRange === "today" ? " hôm nay" : " trong tuần"}
        {selectedCurrencies.size > 0 &&
          ` · ${Array.from(selectedCurrencies).join(", ")}`}
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Thời gian</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Tiền tệ</th>
              <th className="px-4 py-3">Sự kiện</th>
              <th className="px-4 py-3">Tác động</th>
              <th className="px-4 py-3">Dự báo / Trước / Thực tế</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  Không có sự kiện phù hợp bộ lọc.
                </td>
              </tr>
            ) : (
              rows.map(({ ev, status }) => (
                <tr
                  key={ev.id}
                  className={cn(
                    "hover:bg-muted/30",
                    status === "live" && "bg-primary/6",
                  )}
                >
                  <td className="px-4 py-3 font-mono text-foreground/90">
                    {formatInTimeZone(
                      new Date(ev.timeUtc),
                      tz,
                      "yyyy-MM-dd HH:mm",
                    )}
                  </td>
                  <td className="px-4 py-3">{statusBadge(status)}</td>
                  <td className="px-4 py-3 font-medium">{ev.currency}</td>
                  <td className="px-4 py-3">{ev.title}</td>
                  <td className="px-4 py-3">{badge(ev.impact)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {[ev.forecast, ev.previous, ev.actual]
                      .filter(Boolean)
                      .join(" · ") || "—"}
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
