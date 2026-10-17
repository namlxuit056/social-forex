"use client";

import { useTranslations } from "next-intl";
import { BarChart3, TrendingUp, Trophy, DollarSign, Scale, Target } from "lucide-react";
import { StatCard, trendOf } from "@/components/ui/stat-card";

interface Props {
  total: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  payoffRatio: number | null;
  avgR: number | null;
  rCount: number;
}

export function JournalStats({
  total,
  wins,
  losses,
  breakevens,
  winRate,
  totalPnl,
  avgPnl,
  payoffRatio,
  avgR,
  rCount,
}: Props) {
  const t = useTranslations("journal");

  const money = (v: number) => (v >= 0 ? `+$${v.toFixed(2)}` : `-$${Math.abs(v).toFixed(2)}`);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
      <StatCard
        label={t("totalTrades")}
        value={total}
        sub={`${wins}W / ${losses}L / ${breakevens}BE`}
        icon={BarChart3}
      />
      <StatCard
        label={t("winRate")}
        value={`${winRate}%`}
        icon={Trophy}
        trend={total === 0 ? "neutral" : trendOf(winRate, 50)}
      />
      <StatCard label={t("totalPnl")} value={money(totalPnl)} icon={DollarSign} trend={trendOf(totalPnl)} />
      <StatCard label={t("avgPnl")} value={money(avgPnl)} icon={TrendingUp} trend={trendOf(avgPnl)} />
      <StatCard
        label={t("payoffRatio")}
        value={payoffRatio !== null ? payoffRatio.toFixed(2) : "—"}
        sub={t("payoffRatioSub")}
        icon={Scale}
        trend={trendOf(payoffRatio, 1)}
      />
      <StatCard
        label={t("expectancyR")}
        value={avgR !== null ? `${avgR >= 0 ? "+" : ""}${avgR.toFixed(2)}R` : "—"}
        sub={rCount > 0 ? t("expectancyRSub", { count: rCount }) : t("expectancyREmpty")}
        icon={Target}
        trend={trendOf(avgR)}
      />
    </div>
  );
}
