"use client";

import { useTranslations } from "next-intl";
import { Bell, TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { markNotificationRead } from "@/actions/notifications";
import { cn } from "@/lib/utils";

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
    | "SCREENER_ALERT";
  createdAt: string;
  readAt: string | null;
  signal: { id: string; symbol: string; direction: string } | null;
  actor: { id: string; name: string | null; email: string | null } | null;
};

export function NotificationList({
  items,
  locale,
}: {
  items: NotificationRow[];
  locale: string;
}) {
  const t = useTranslations("notifications");

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center">
        <Bell className="size-10 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card/40">
      {items.map((n) => {
        const unread = n.readAt === null;
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
                  ? "Don't forget to write your journal / plan for today!"
                  : n.kind === "PRICE_ALERT"
                    ? "Price alert triggered"
                    : n.kind === "JOURNAL_REVIEW"
                      ? "Weekly trading report is ready"
                      : n.kind === "SCREENER_ALERT"
                        ? t("screenerAlert")
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
                void markNotificationRead(n.id);
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
