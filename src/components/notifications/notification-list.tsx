"use client";

import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { markNotificationRead } from "@/actions/notifications";
import { cn } from "@/lib/utils";

export type NotificationRow = {
  id: string;
  kind: "SIGNAL_NEW" | "USER_FOLLOWED";
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
            : n.signal
              ? t("signalNew", {
                  symbol: n.signal.symbol,
                  direction: n.signal.direction,
                })
              : t("empty");

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
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString(locale)}
                </p>
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
