import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getClosedSignalStatsForAuthor,
  TRADER_STATS_MIN_SAMPLE,
  winRatePercent,
} from "@/lib/signals/public-performance-stats";
import { TrendingUp } from "lucide-react";

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
  const { wins, losses, total } = await getClosedSignalStatsForAuthor(userId);
  const showRate = total >= TRADER_STATS_MIN_SAMPLE;
  const rate = showRate ? winRatePercent(wins, total) : null;

  return (
    <Card className="border-border bg-card/50 ring-1 ring-foreground/5">
      <CardHeader className="pb-2">
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
          <div className="space-y-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("traderStats.winRateLabel")}
              </p>
              <p className="font-mono text-4xl font-semibold tabular-nums tracking-tight text-foreground">
                {rate}%
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("traderStats.winsLosses", { wins, losses, total })}
            </p>
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
