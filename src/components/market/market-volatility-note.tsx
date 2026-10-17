"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Clock, Flame, TrendingUp } from "lucide-react";
import {
  getMarketVolatilityState,
  type OverlapKey,
  type VolatilityLevel,
} from "@/lib/market/session-overlaps";
import { cn } from "@/lib/utils";

type Props = {
  serverNowIso: string;
  locale: string;
};

// Start from the server timestamp so SSR and the first client render agree, then
// switch to the real client clock on mount — this stays correct even if the page
// is statically cached and `serverNowIso` is stale.
function useSyncedNow(serverNowIso: string, intervalMs = 1000): number {
  const [initialServerNowMs] = useState(() => {
    const ms = new Date(serverNowIso).getTime();
    return Number.isNaN(ms) ? Date.now() : ms;
  });
  const [now, setNow] = useState(initialServerNowMs);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, intervalMs);
    tick();
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h >= 6) return `${h}h ${pad(m)}m`;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function MarketVolatilityNote({ serverNowIso, locale }: Props) {
  const t = useTranslations("marketVolatility");
  const nowMs = useSyncedNow(serverNowIso);

  // Times display in Vietnam time for the vi locale, UTC for en — as requested.
  const displayTz = locale === "en" ? "UTC" : "Asia/Ho_Chi_Minh";
  const tzLabel = locale === "en" ? "UTC" : "GMT+7";

  const timeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "vi-VN", {
        timeZone: displayTz,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    [locale, displayTz],
  );
  const dayTimeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "vi-VN", {
        timeZone: displayTz,
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    [locale, displayTz],
  );

  // Recompute the session/overlap windows at most once every 20s; the countdown
  // string below re-renders every second off `nowMs` without touching Intl.
  const state = useMemo(
    () => getMarketVolatilityState(new Date(nowMs)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Math.floor(nowMs / 20_000)],
  );

  const pairLabel = (key: OverlapKey) => t(`pair_${key}`);
  const levelLabel = (level: VolatilityLevel) => t(`level_${level}`);

  const levelClass: Record<VolatilityLevel, string> = {
    high: "bg-red-500/15 text-red-600 ring-red-500/30 dark:text-red-400",
    medium: "bg-amber-500/15 text-amber-600 ring-amber-500/30 dark:text-amber-400",
    low: "bg-sky-500/15 text-sky-600 ring-sky-500/30 dark:text-sky-400",
  };

  const highActive = state.currentOverlap?.level === "high";

  let headline: ReactNode;
  let countdownTarget: Date | null = null;
  let countdownLabelKey: "endsIn" | "startsIn" | "reopensIn" | null = null;

  if (!state.marketOpen && state.nextForexOpen) {
    headline = (
      <>
        <span className="font-semibold text-foreground">{t("marketClosed")}</span>{" "}
        <span className="text-muted-foreground">
          {t("reopensAt", { time: dayTimeFmt.format(state.nextForexOpen), tz: tzLabel })}
        </span>
      </>
    );
    countdownTarget = state.nextForexOpen;
    countdownLabelKey = "reopensIn";
  } else if (highActive && state.currentOverlap) {
    headline = (
      <>
        <span className="font-semibold text-red-600 dark:text-red-400">
          {t("ongoingHigh", { pair: pairLabel(state.currentOverlap.key) })}
        </span>{" "}
        <span className="text-muted-foreground">
          {t("windowRange", {
            from: timeFmt.format(state.currentOverlap.start),
            to: timeFmt.format(state.currentOverlap.end),
            tz: tzLabel,
          })}
        </span>
      </>
    );
    countdownTarget = state.currentOverlap.end;
    countdownLabelKey = "endsIn";
  } else if (state.nextHighVolatility) {
    headline = (
      <>
        <span className="font-semibold text-foreground">
          {t("nextHighLabel", { pair: pairLabel(state.nextHighVolatility.key) })}
        </span>{" "}
        <span className="text-muted-foreground">
          {t("startsAt", {
            time: dayTimeFmt.format(state.nextHighVolatility.start),
            tz: tzLabel,
          })}
        </span>
      </>
    );
    countdownTarget = state.nextHighVolatility.start;
    countdownLabelKey = "startsIn";
  }

  const remainingMs = countdownTarget ? countdownTarget.getTime() - nowMs : 0;

  return (
    <section
      aria-labelledby="market-volatility-heading"
      className="rounded-xl border border-border bg-card p-5 sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h2
            id="market-volatility-heading"
            className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight text-foreground"
          >
            {highActive ? (
              <Flame className="size-5 shrink-0 text-red-500" aria-hidden />
            ) : (
              <TrendingUp className="size-5 shrink-0 text-amber-500" aria-hidden />
            )}
            {t("title")}
          </h2>
          <p className="text-sm leading-relaxed">{headline}</p>
          <p className="text-xs text-muted-foreground">{t("why")}</p>
        </div>

        {countdownTarget && countdownLabelKey && (
          <div className="shrink-0 rounded-xl bg-muted px-4 py-3 text-center">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t(countdownLabelKey)}
            </p>
            <p
              className="mt-0.5 font-mono text-2xl font-semibold tabular-nums text-foreground"
              aria-live="off"
            >
              {formatCountdown(remainingMs)}
            </p>
          </div>
        )}
      </div>

      {state.marketOpen && state.activeSessions.length > 0 && (
        <p className="mt-4 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5 shrink-0" aria-hidden />
          {t("activeNow")}:
          {state.activeSessions.map((s) => (
            <span
              key={s}
              className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground"
            >
              {t(`session_${s}`)}
            </span>
          ))}
        </p>
      )}

      {state.upcomingOverlaps.length > 0 && (
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border">
          {state.upcomingOverlaps.map((o) => {
            const live = o.start.getTime() <= nowMs && nowMs < o.end.getTime();
            return (
              <li
                key={`${o.key}-${o.start.getTime()}`}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ring-1",
                      levelClass[o.level],
                    )}
                  >
                    {levelLabel(o.level)}
                  </span>
                  <span className="truncate font-medium text-foreground">
                    {pairLabel(o.key)}
                  </span>
                </span>
                <span className="shrink-0 text-right text-xs">
                  <span className="font-mono tabular-nums text-foreground">
                    {timeFmt.format(o.start)}–{timeFmt.format(o.end)}
                  </span>
                  <span className="ml-1.5 text-muted-foreground">
                    {live
                      ? t("liveNow")
                      : t("inLabel", { countdown: formatCountdown(o.start.getTime() - nowMs) })}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-3 text-[11px] text-muted-foreground">
        {t("tzNote", { tz: tzLabel })}
      </p>
    </section>
  );
}
