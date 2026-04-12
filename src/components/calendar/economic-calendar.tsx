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

  const rows = useMemo(
    () =>
      sorted.map((ev) => ({
        ev,
        status: computeStatus(ev.timeUtc, now),
      })),
    [sorted, now],
  );

  const tz = zone === "utc" ? "UTC" : "Asia/Ho_Chi_Minh";
  const zoneLabel = zone === "utc" ? "UTC" : "Việt Nam (UTC+7)";

  const sourceLabel =
    source === "fmp"
      ? "FMP (cache DB)"
      : source === "stale_db"
        ? "Cache DB (API lỗi)"
        : "Mẫu";

  return (
    <div className="space-y-4">
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

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Múi giờ hiển thị:</span>
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
            className="rounded-md"
            onClick={() => startTransition(() => setZone("vn"))}
          >
            VN
          </Button>
          <Button
            type="button"
            variant={zone === "utc" ? "default" : "ghost"}
            size="sm"
            className="rounded-md"
            onClick={() => startTransition(() => setZone("utc"))}
          >
            UTC
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">{zoneLabel}</span>
      </div>

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
            {rows.map(({ ev, status }) => (
              <tr
                key={ev.id}
                className={cn(
                  "hover:bg-muted/30",
                  status === "live" && "bg-primary/[0.06]",
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
