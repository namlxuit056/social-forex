"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { markNotificationRead } from "@/actions/notifications";
import { cn } from "@/lib/utils";

type TechnicalRatingMeta = {
  symbol: string;
  signal: "buy" | "sell";
  score4h: number;
  score1d: number;
};

export type NotificationRow = {
  id: string;
  kind:
    | "SIGNAL_NEW"
    | "SIGNAL_WIN"
    | "SIGNAL_LOSS"
    | "USER_FOLLOWED"
    | "STREAK_REMINDER"
    | "PRICE_ALERT"
    | "JOURNAL_REVIEW"
    | "SCREENER_ALERT"
    | "MT5_AUTO_CLOSE"
    | "CALENDAR_ACTUAL_SIGNAL"
    | "TECHNICAL_RATING_SIGNAL"
    | "TRADING_AGENTS_DONE";
  createdAt: string;
  readAt: string | null;
  signal: { id: string; symbol: string; direction: string } | null;
  actor: { id: string; name: string | null; email: string | null } | null;
  meta?: Record<string, unknown> | null;
};

function asTechnicalRatingMeta(meta: NotificationRow["meta"]): TechnicalRatingMeta | null {
  if (
    !meta ||
    typeof meta.symbol !== "string" ||
    (meta.signal !== "buy" && meta.signal !== "sell") ||
    typeof meta.score4h !== "number" ||
    typeof meta.score1d !== "number"
  ) {
    return null;
  }
  return {
    symbol: meta.symbol,
    signal: meta.signal,
    score4h: meta.score4h,
    score1d: meta.score1d,
  };
}

type CalendarActualMeta = {
  eventId: string;
  title: string;
  currency: string;
  bias: "bullish" | "bearish";
};

function asCalendarActualMeta(meta: NotificationRow["meta"]): CalendarActualMeta | null {
  if (
    !meta ||
    typeof meta.eventId !== "string" ||
    typeof meta.title !== "string" ||
    typeof meta.currency !== "string" ||
    (meta.bias !== "bullish" && meta.bias !== "bearish")
  ) {
    return null;
  }
  return {
    eventId: meta.eventId,
    title: meta.title,
    currency: meta.currency,
    bias: meta.bias,
  };
}

type TradingAgentsMeta = { runId: string; symbol: string; status: string; rating: string | null };

function asTradingAgentsMeta(meta: NotificationRow["meta"]): TradingAgentsMeta | null {
  if (!meta || typeof meta.runId !== "string" || typeof meta.symbol !== "string") return null;
  return {
    runId: meta.runId,
    symbol: meta.symbol,
    status: typeof meta.status === "string" ? meta.status : "DONE",
    rating: typeof meta.rating === "string" ? meta.rating : null,
  };
}

const EXTERNAL_SOURCES = ["cot", "oandaBook", "myfxbook", "igDailyfx"] as const;
type ExternalSource = (typeof EXTERNAL_SOURCES)[number];

/** Tín hiệu TECHNICAL_RATING_SIGNAL nhưng đến từ nguồn ngoài TradingView (COT, sentiment...). */
function asExternalSignalMeta(
  meta: NotificationRow["meta"],
): { symbol: string; signal: "buy" | "sell"; source: ExternalSource } | null {
  if (
    !meta ||
    typeof meta.symbol !== "string" ||
    (meta.signal !== "buy" && meta.signal !== "sell") ||
    typeof meta.source !== "string" ||
    !EXTERNAL_SOURCES.includes(meta.source as ExternalSource)
  ) {
    return null;
  }
  return { symbol: meta.symbol, signal: meta.signal, source: meta.source as ExternalSource };
}

export function NotificationList({
  items,
  locale,
}: {
  items: NotificationRow[];
  locale: string;
}) {
  const t = useTranslations("notifications");
  const ts = useTranslations("signalSources");
  const tta = useTranslations("tradingAgents");
  // Optimistic: đánh dấu read ngay khi click, revert nếu server action fail
  const [optimisticReadIds, setOptimisticReadIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const handleClick = (id: string) => {
    setOptimisticReadIds((prev) => new Set(prev).add(id));
    markNotificationRead(id).catch(() => {
      setOptimisticReadIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
        <Bell className="size-10 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {items.map((n) => {
        const unread = n.readAt === null && !optimisticReadIds.has(n.id);
        const ratingMeta =
          n.kind === "TECHNICAL_RATING_SIGNAL" ? asTechnicalRatingMeta(n.meta) : null;
        const externalMeta =
          n.kind === "TECHNICAL_RATING_SIGNAL" ? asExternalSignalMeta(n.meta) : null;
        const calendarMeta =
          n.kind === "CALENDAR_ACTUAL_SIGNAL" ? asCalendarActualMeta(n.meta) : null;
        const agentsMeta =
          n.kind === "TRADING_AGENTS_DONE" ? asTradingAgentsMeta(n.meta) : null;
        const href =
          n.kind === "USER_FOLLOWED" && n.actor
            ? `/u/${n.actor.id}`
            : n.kind === "STREAK_REMINDER"
              ? "/journal"
              : n.kind === "PRICE_ALERT"
                ? "/alerts"
                : n.kind === "JOURNAL_REVIEW"
                  ? "/journal?tab=weekly"
                  : n.kind === "SCREENER_ALERT"
                    ? "/screener"
                    : n.kind === "MT5_AUTO_CLOSE"
                      ? "/positions"
                      : n.kind === "CALENDAR_ACTUAL_SIGNAL"
                        ? calendarMeta
                          ? `/calendar?currencies=${encodeURIComponent(calendarMeta.currency)}&highlight=${encodeURIComponent(calendarMeta.eventId)}`
                          : "/calendar"
                        : n.kind === "TECHNICAL_RATING_SIGNAL"
                          ? "/quotes/technical-rating"
                          : n.kind === "TRADING_AGENTS_DONE"
                            ? agentsMeta
                              ? `/trading-agents?run=${agentsMeta.runId}`
                              : "/trading-agents"
                          : n.signal
                            ? `/signals/${n.signal.id}`
                            : "/notifications";

        const title =
          n.kind === "USER_FOLLOWED" && n.actor
            ? t("followYou", {
                name:
                  n.actor.name ??
                  n.actor.email?.split("@")[0] ??
                  t("followUnknownName"),
              })
            : n.kind === "SIGNAL_WIN" && n.signal
              ? t("signalWin", {
                  symbol: n.signal.symbol,
                  direction: n.signal.direction,
                })
              : n.kind === "SIGNAL_LOSS" && n.signal
                ? t("signalLoss", {
                    symbol: n.signal.symbol,
                    direction: n.signal.direction,
                  })
                : n.kind === "STREAK_REMINDER"
                  ? t("streakReminder")
                  : n.kind === "PRICE_ALERT"
                    ? t("priceAlert")
                    : n.kind === "JOURNAL_REVIEW"
                      ? t("journalReview")
                      : n.kind === "SCREENER_ALERT"
                        ? t("screenerAlert")
                        : n.kind === "MT5_AUTO_CLOSE"
                          ? t("mt5AutoClose")
                          : n.kind === "CALENDAR_ACTUAL_SIGNAL"
                            ? calendarMeta
                              ? t(
                                  calendarMeta.bias === "bullish"
                                    ? "calendarActualSignalBullish"
                                    : "calendarActualSignalBearish",
                                  { event: calendarMeta.title, currency: calendarMeta.currency },
                                )
                              : t("calendarActualSignal")
                            : n.kind === "TECHNICAL_RATING_SIGNAL"
                              ? externalMeta
                                ? ts(
                                    externalMeta.signal === "buy"
                                      ? "externalSignalBuy"
                                      : "externalSignalSell",
                                    {
                                      symbol: externalMeta.symbol,
                                      source: ts(externalMeta.source),
                                    },
                                  )
                                : ratingMeta
                                  ? t(
                                      ratingMeta.signal === "buy"
                                        ? "technicalRatingSignalBuy"
                                        : "technicalRatingSignalSell",
                                      { symbol: ratingMeta.symbol },
                                    )
                                  : t("technicalRatingSignal")
                              : n.kind === "TRADING_AGENTS_DONE" && agentsMeta
                                ? agentsMeta.status === "DONE"
                                  ? t("tradingAgentsDone", {
                                      symbol: agentsMeta.symbol,
                                      rating: tta(`rating.${agentsMeta.rating ?? "REVIEW"}`),
                                    })
                                  : t("tradingAgentsFailed", { symbol: agentsMeta.symbol })
                              : n.signal
                                ? t("signalNew", {
                                  symbol: n.signal.symbol,
                                  direction: n.signal.direction,
                                })
                              : t("empty");

        const accentClass =
          n.kind === "SIGNAL_WIN"
            ? "text-green-400"
            : n.kind === "SIGNAL_LOSS"
              ? "text-red-400"
              : "";

        return (
          <li key={n.id}>
            <Link
              href={href}
              onClick={() => {
                if (unread) handleClick(n.id);
              }}
              className={cn(
                "flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between",
                unread && "bg-primary/5",
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                {n.kind === "SIGNAL_WIN" && (
                  <TrendingUp className="size-3.5 shrink-0 text-green-400" />
                )}
                {n.kind === "SIGNAL_LOSS" && (
                  <TrendingDown className="size-3.5 shrink-0 text-red-400" />
                )}
                <div className="min-w-0">
                  <p className={cn("text-sm font-medium text-foreground", accentClass)}>
                    {title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString(locale)}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  "shrink-0 text-xs font-medium",
                  unread ? "text-primary" : "text-muted-foreground",
                )}
              >
                {unread ? t("unreadBadge") : t("readBadge")}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
