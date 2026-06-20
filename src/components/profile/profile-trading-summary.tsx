import { Activity, RadioTower, ShieldCheck, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import {
  getClosedSignalStatsForAuthor,
  TRADER_STATS_MIN_SAMPLE,
  winRatePercent,
} from "@/lib/signals/public-performance-stats";
import { cn } from "@/lib/utils";

type Translator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

function fmtCurrency(value: number, currency?: string | null) {
  const sign = value >= 0 ? "+" : "-";
  const amount = `${sign}${Math.abs(value).toFixed(2)}`;
  return currency ? `${amount} ${currency}` : amount;
}

export async function ProfileTradingSummary({
  profileUserId,
  t,
}: {
  profileUserId: string;
  t: Translator;
}) {
  const [stats, mt5Connection, mt5Links] = await Promise.all([
    getClosedSignalStatsForAuthor(profileUserId),
    prisma.mt5Connection.findFirst({
      where: { userId: profileUserId, revokedAt: null },
      orderBy: { lastSeenAt: "desc" },
      select: {
        accountCurrency: true,
        openPositions: true,
        lastSeenAt: true,
      },
    }),
    prisma.mt5SignalLink.findMany({
      where: {
        signal: { authorId: profileUserId },
      },
      select: {
        lastProfit: true,
        signal: { select: { status: true } },
      },
      take: 80,
    }),
  ]);

  if (!mt5Connection && stats.total === 0 && mt5Links.length === 0) return null;

  const rate =
    stats.total >= TRADER_STATS_MIN_SAMPLE
      ? `${winRatePercent(stats.wins, stats.total)}%`
      : "—";
  const activeCount = mt5Links.filter((row) => row.signal.status === "ACTIVE").length;
  const netPnl = mt5Links.reduce((sum, row) => sum + (row.lastProfit ?? 0), 0);
  const hasLiveSync = !!mt5Connection?.lastSeenAt;

  const items = [
    {
      label: t("overviewWinRate"),
      value: rate,
      sub: t("traderStats.winsLosses", {
        wins: stats.wins,
        losses: stats.losses,
        total: stats.total,
      }),
      icon: TrendingUp,
      valueClass: "text-foreground",
    },
    {
      label: t("overviewLivePositions"),
      value: String(mt5Connection?.openPositions ?? activeCount),
      sub: hasLiveSync ? t("mt5ReadOnlyBadge") : t("profileNoLivePositions"),
      icon: RadioTower,
      valueClass: hasLiveSync ? "text-emerald-600 dark:text-emerald-300" : "text-muted-foreground",
    },
    {
      label: t("overviewNetPnl"),
      value: fmtCurrency(netPnl, mt5Connection?.accountCurrency),
      sub: t("mt5SyncedTitle"),
      icon: Activity,
      valueClass:
        netPnl > 0
          ? "text-emerald-600 dark:text-emerald-300"
          : netPnl < 0
            ? "text-red-600 dark:text-red-300"
            : "text-foreground",
    },
  ];

  return (
    <section className="rounded-xl border border-border bg-card/50 p-4 ring-1 ring-foreground/5">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-base font-semibold text-foreground">
            {t("profileTrustSummaryTitle")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("profileTrustSummaryHint")}
          </p>
        </div>
        {hasLiveSync ? (
          <Badge
            variant="outline"
            className="w-fit gap-1.5 border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
          >
            <ShieldCheck className="size-3" aria-hidden />
            {t("mt5ReadOnlyBadge")}
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-lg border border-border/60 bg-muted/20 px-3 py-3"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="size-3.5" aria-hidden />
                {item.label}
              </div>
              <p
                className={cn(
                  "mt-1 font-mono text-xl font-semibold tabular-nums",
                  item.valueClass,
                )}
              >
                {item.value}
              </p>
              <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                {item.sub}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
