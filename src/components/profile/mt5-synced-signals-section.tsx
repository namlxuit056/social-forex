import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

function statusTone(status: string) {
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

function statusLabel(status: string, t: (key: string) => string) {
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

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function Mt5SyncedSignalsSection({
  profileUserId,
  locale,
  t,
}: {
  profileUserId: string;
  locale: string;
  t: (key: string) => string;
}) {
  const rows = await prisma.mt5SignalLink.findMany({
    where: {
      signal: { authorId: profileUserId },
    },
    orderBy: { lastSeenAt: "desc" },
    take: 8,
    select: {
      kind: true,
      mt5Ticket: true,
      lastProfit: true,
      lastSeenAt: true,
      createdAt: true,
      updatedAt: true,
      connection: { select: { name: true } },
      signal: {
        select: {
          id: true,
          symbol: true,
          direction: true,
          entry: true,
          stopLoss: true,
          takeProfit: true,
          status: true,
          closedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (rows.length === 0) return null;

  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";
  const grouped = rows.reduce<
    Array<{ key: string; date: Date; items: typeof rows }>
  >((groups, row) => {
    const key = dayKey(row.signal.createdAt);
    const existing = groups.find((group) => group.key === key);
    if (existing) {
      existing.items.push(row);
    } else {
      groups.push({ key, date: row.signal.createdAt, items: [row] });
    }
    return groups;
  }, []);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
          {t("mt5SyncedTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("mt5SyncedHint")}
        </p>
      </div>

      <div className="space-y-5">
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
              {group.items.map((signal) => {
                const linkedSignal = signal.signal;
                const tone = statusTone(linkedSignal.status);
                const kindLabel =
                  signal.kind === "PENDING_ORDER"
                    ? t("mt5KindPending")
                    : t("mt5KindPosition");
                const statusTime =
                  linkedSignal.closedAt ?? signal.lastSeenAt ?? linkedSignal.updatedAt;

                return (
                  <Link
                    key={linkedSignal.id}
                    href={`/signals/${linkedSignal.id}`}
                    className="group relative overflow-hidden rounded-lg border border-border/70 bg-card/55 p-4 ring-1 ring-foreground/5 transition hover:border-primary/35 hover:bg-card"
                  >
                    <span
                      className={cn("absolute inset-y-0 left-0 w-1", tone.rail)}
                      aria-hidden
                    />
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-heading text-base font-semibold text-foreground">
                            {linkedSignal.symbol}
                          </span>
                          <Badge variant="outline" className="border-border/70 bg-muted/30">
                            {linkedSignal.direction}
                          </Badge>
                          <Badge variant="outline">{kindLabel}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t("mt5Ticket")}:{" "}
                          <span className="font-mono text-foreground/90">
                            {signal.mt5Ticket}
                          </span>{" "}
                          · {signal.connection.name}
                        </p>
                      </div>

                      <div
                        className={cn(
                          "min-w-40 rounded-md border px-3 py-2 text-left lg:text-right",
                          tone.panel,
                        )}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-normal opacity-80">
                          {t("mt5StatusLabel")}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold">
                          {statusLabel(linkedSignal.status, t)}
                        </p>
                        <p className="mt-1 text-[11px] opacity-75">
                          {statusTime.toLocaleString(dateLocale, {
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
                        <p className="font-mono text-foreground">{linkedSignal.entry}</p>
                      </div>
                      <div className="rounded-md bg-muted/25 px-2 py-1.5">
                        <p className="text-muted-foreground">{t("mt5Sl")}</p>
                        <p className="font-mono text-foreground">{linkedSignal.stopLoss ?? "—"}</p>
                      </div>
                      <div className="rounded-md bg-muted/25 px-2 py-1.5">
                        <p className="text-muted-foreground">{t("mt5Tp")}</p>
                        <p className="font-mono text-foreground">{linkedSignal.takeProfit ?? "—"}</p>
                      </div>
                      <div className="rounded-md bg-muted/25 px-2 py-1.5">
                        <p className="text-muted-foreground">{t("mt5Profit")}</p>
                        <p
                          className={cn(
                            "font-mono",
                            (signal.lastProfit ?? 0) > 0
                              ? "text-emerald-300"
                              : (signal.lastProfit ?? 0) < 0
                                ? "text-red-300"
                                : "text-foreground",
                          )}
                        >
                          {signal.lastProfit != null
                            ? signal.lastProfit.toFixed(2)
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
