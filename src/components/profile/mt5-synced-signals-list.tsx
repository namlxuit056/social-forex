"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Mt5SignalItem = {
  id: string;
  symbol: string;
  direction: string;
  entry: number;
  stopLoss: number | null;
  takeProfit: number | null;
  status: string;
  kind: "PENDING_ORDER" | "OPEN_POSITION";
  mt5Ticket: string;
  connectionName: string;
  accountCurrency: string | null;
  lastProfit: number | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  lastSeenAt: string | null;
};

type StatusFilter = "ALL" | "ACTIVE" | "PENDING" | "CLOSED_WIN" | "CLOSED_LOSS" | "CANCELLED";

type Tone = {
  badge: string;
  panel: string;
  rail: string;
};

function statusTone(status: string): Tone {
  switch (status) {
    case "PENDING":
      return {
        badge: "border-amber-500/45 bg-amber-500/15 text-amber-200",
        panel: "border-amber-500/40 bg-amber-500/10 text-amber-100",
        rail: "bg-amber-400",
      };
    case "ACTIVE":
      return {
        badge: "border-emerald-500/45 bg-emerald-500/15 text-emerald-200",
        panel: "border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
        rail: "bg-emerald-400",
      };
    case "CLOSED_WIN":
      return {
        badge: "border-sky-500/45 bg-sky-500/15 text-sky-200",
        panel: "border-sky-500/40 bg-sky-500/10 text-sky-100",
        rail: "bg-sky-400",
      };
    case "CLOSED_LOSS":
      return {
        badge: "border-destructive/45 bg-destructive/15 text-red-300",
        panel: "border-destructive/40 bg-destructive/10 text-red-200",
        rail: "bg-destructive",
      };
    default:
      return {
        badge: "border-muted-foreground/35 bg-muted/40 text-muted-foreground",
        panel: "border-muted-foreground/30 bg-muted/25 text-muted-foreground",
        rail: "bg-muted-foreground",
      };
  }
}

function statusLabel(status: string, t: ReturnType<typeof useTranslations<"profile">>) {
  switch (status) {
    case "PENDING":
      return t("mt5StatusPending");
    case "ACTIVE":
      return t("mt5StatusActive");
    case "CLOSED_WIN":
      return t("mt5StatusWin");
    case "CLOSED_LOSS":
      return t("mt5StatusLoss");
    case "CANCELLED":
      return t("mt5StatusCancelled");
    default:
      return status;
  }
}

function dayKey(dateIso: string) {
  return dateIso.slice(0, 10);
}

function formatPnl(value: number | null, currency: string | null) {
  if (value == null) return "—";
  const sign = value >= 0 ? "+" : "-";
  const amount = `${sign}${Math.abs(value).toFixed(2)}`;
  return currency ? `${amount} ${currency}` : amount;
}

function formatPrice(value: number | null, emptyLabel: string) {
  if (value == null || value === 0) return emptyLabel;
  return String(value);
}

function SignalCard({
  item,
  locale,
}: {
  item: Mt5SignalItem;
  locale: string;
}) {
  const t = useTranslations("profile");
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";
  const tone = statusTone(item.status);
  const kindLabel =
    item.kind === "PENDING_ORDER" ? t("mt5KindPending") : t("mt5KindPosition");
  const statusTime = item.closedAt ?? item.lastSeenAt ?? item.updatedAt;

  return (
    <Link
      href={`/signals/${item.id}`}
      className="group relative overflow-hidden rounded-lg border border-border/70 bg-card/55 p-4 ring-1 ring-foreground/5 transition hover:border-primary/35 hover:bg-card"
    >
      <span className={cn("absolute inset-y-0 left-0 w-1", tone.rail)} aria-hidden />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-heading text-base font-semibold text-foreground">
              {item.symbol}
            </span>
            <Badge variant="outline" className="border-border/70 bg-muted/30">
              {item.direction}
            </Badge>
            <Badge variant="outline">{kindLabel}</Badge>
            <Badge variant="outline" className={cn("lg:hidden", tone.badge)}>
              {statusLabel(item.status, t)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("mt5Ticket")}:{" "}
            <span className="font-mono text-foreground/90">{item.mt5Ticket}</span>{" "}
            · {item.connectionName}
          </p>
        </div>

        <div
          className={cn(
            "hidden min-w-40 rounded-md border px-3 py-2 text-left lg:block lg:text-right",
            tone.panel,
          )}
        >
          <p className="text-[10px] font-semibold uppercase tracking-normal opacity-80">
            {t("mt5StatusLabel")}
          </p>
          <p className="mt-0.5 text-sm font-semibold">{statusLabel(item.status, t)}</p>
          <p className="mt-1 text-[11px] opacity-75">
            {new Date(statusTime).toLocaleString(dateLocale, {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div className="rounded-md bg-muted/25 px-2 py-1.5">
          <p className="text-muted-foreground">{t("mt5Entry")}</p>
          <p className="font-mono text-foreground">{item.entry}</p>
        </div>
        <div className="rounded-md bg-muted/25 px-2 py-1.5">
          <p className="text-muted-foreground">{t("mt5Sl")}</p>
          <p className="font-mono text-foreground">
            {formatPrice(item.stopLoss, t("mt5NoSl"))}
          </p>
        </div>
        <div className="rounded-md bg-muted/25 px-2 py-1.5">
          <p className="text-muted-foreground">{t("mt5Tp")}</p>
          <p className="font-mono text-foreground">
            {formatPrice(item.takeProfit, t("mt5NoTp"))}
          </p>
        </div>
        <div className="rounded-md bg-muted/25 px-2 py-1.5">
          <p className="text-muted-foreground">{t("mt5Profit")}</p>
          <p
            className={cn(
              "font-mono",
              (item.lastProfit ?? 0) > 0
                ? "text-emerald-300"
                : (item.lastProfit ?? 0) < 0
                  ? "text-red-300"
                  : "text-foreground",
            )}
          >
            {formatPnl(item.lastProfit, item.accountCurrency)}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function Mt5SyncedSignalsList({
  items,
  locale,
}: {
  items: Mt5SignalItem[];
  locale: string;
}) {
  const t = useTranslations("profile");
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const statusOptions: Array<{ value: StatusFilter; label: string }> = [
    { value: "ALL", label: t("mt5StatusFilterAll") },
    { value: "ACTIVE", label: t("mt5StatusActive") },
    { value: "PENDING", label: t("mt5StatusPending") },
    { value: "CLOSED_WIN", label: t("mt5StatusWin") },
    { value: "CLOSED_LOSS", label: t("mt5StatusLoss") },
    { value: "CANCELLED", label: t("mt5StatusCancelled") },
  ];

  const filtered = useMemo(
    () =>
      statusFilter === "ALL"
        ? items
        : items.filter((item) => item.status === statusFilter),
    [items, statusFilter],
  );

  const activeItems = filtered.filter((item) => item.status === "ACTIVE");
  const historyItems = filtered.filter((item) => item.status !== "ACTIVE");
  const grouped = historyItems.reduce<
    Array<{ key: string; date: Date; items: Mt5SignalItem[] }>
  >((groups, item) => {
    const key = dayKey(item.createdAt);
    const existing = groups.find((group) => group.key === key);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.push({ key, date: new Date(item.createdAt), items: [item] });
    }
    return groups;
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setStatusFilter(option.value)}
            className={cn(
              "min-h-9 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all",
              statusFilter === option.value
                ? "border-primary/35 bg-primary/15 text-primary"
                : "border-transparent bg-muted/40 text-muted-foreground/65 hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {activeItems.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h3 className="whitespace-nowrap text-xs font-semibold uppercase text-emerald-300">
              {t("mt5RunningNowTitle")}
            </h3>
            <div className="h-px flex-1 bg-emerald-500/25" />
            <span className="text-xs text-muted-foreground">
              {activeItems.length} {t("mt5Orders")}
            </span>
          </div>
          <div className="grid gap-3">
            {activeItems.map((item) => (
              <SignalCard key={item.id} item={item} locale={locale} />
            ))}
          </div>
        </div>
      ) : null}

      {grouped.length > 0 ? (
        <div className="space-y-5">
          {activeItems.length > 0 ? (
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">
              {t("mt5HistoryTitle")}
            </h3>
          ) : null}
          {grouped.map((group) => (
            <div key={group.key} className="space-y-2">
              <div className="flex items-center gap-3">
                <h3 className="whitespace-nowrap text-xs font-semibold uppercase text-muted-foreground">
                  {group.date.toLocaleDateString(dateLocale, {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </h3>
                <div className="h-px flex-1 bg-border/70" />
                <span className="text-xs text-muted-foreground">
                  {group.items.length} {t("mt5Orders")}
                </span>
              </div>
              <div className="grid gap-3">
                {group.items.map((item) => (
                  <SignalCard key={item.id} item={item} locale={locale} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/70 px-3 py-6 text-center text-sm text-muted-foreground">
          {t("mt5NoStatusFilter")}
        </p>
      ) : null}
    </div>
  );
}
