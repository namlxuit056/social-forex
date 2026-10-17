import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getSignalPerformanceStats,
  TRADER_STATS_MIN_SAMPLE,
  winRatePercent,
} from "@/lib/signals/public-performance-stats";
import { prisma } from "@/lib/prisma";
import { TrendingUp, ShieldCheck } from "lucide-react";

type Props = {
  userId: string;
  /** Primary CTA target (e.g. `/signals` or `/signals?author=…`). */
  signalsListHref: string;
  /** Button label — use `traderStats.viewSignalsByAuthor` when href filters by author. */
  signalsCtaLabel: string;
};

export async function TraderPerformanceCard({
  userId,
  signalsListHref,
  signalsCtaLabel,
}: Props) {
  const t = await getTranslations("profile");

  const [stats, hasMt5] = await Promise.all([
    getSignalPerformanceStats(userId),
    prisma.mt5Connection.findFirst({
      where: { userId, revokedAt: null },
      select: { id: true },
    }),
  ]);

  const { wins, losses, total, avgRR, consistencyScore } = stats;
  const showRate = total >= TRADER_STATS_MIN_SAMPLE;
  const rate = showRate ? winRatePercent(wins, total) : null;
  const activeDays = Math.round((consistencyScore / 100) * 30);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex items-center justify-between pb-2">
        <div className="flex flex-col gap-1">
          <CardTitle className="flex items-center gap-2 font-heading text-base font-semibold text-foreground">
            <TrendingUp
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            {t("traderStats.title")}
          </CardTitle>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("traderStats.disclaimer")}
          </p>
        </div>
        {hasMt5 && (
          <Badge
            variant="outline"
            className="gap-1 border-emerald-500/35 bg-emerald-500/10 text-emerald-400 text-xs shrink-0"
          >
            <ShieldCheck className="size-3" />
            {t("mt5ReadOnlyBadge")}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">{t("traderStats.empty")}</p>
        ) : !showRate ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t("traderStats.insufficient", {
                count: total,
                min: TRADER_STATS_MIN_SAMPLE,
              })}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("traderStats.winsLosses", { wins, losses, total })}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {/* Win Rate */}
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("traderStats.winRateLabel")}
              </p>
              <p className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                {rate}%
              </p>
              <p className="text-xs text-muted-foreground">
                {wins}W / {losses}L
              </p>
            </div>

            {/* Avg R:R */}
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("traderStats.avgRRLabel")}
              </p>
              <p className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                {avgRR !== null ? `1 : ${avgRR.toFixed(1)}` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {avgRR !== null
                  ? t("traderStats.avgRRSignals", { total })
                  : t("traderStats.avgRREmpty")}
              </p>
            </div>

            {/* Consistency */}
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("traderStats.consistencyLabel")}
              </p>
              <p className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                {consistencyScore}%
              </p>
              <p className="text-xs text-muted-foreground">
                {t("traderStats.consistencyValue", {
                  active: activeDays,
                  total: 30,
                })}
              </p>
            </div>
          </div>
        )}

        <Link
          href={signalsListHref}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "inline-flex w-full min-h-11 sm:w-auto",
          )}
        >
          {signalsCtaLabel}
        </Link>
      </CardContent>
    </Card>
  );
}
