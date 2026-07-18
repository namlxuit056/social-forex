"use client";

import { useTranslations } from "next-intl";
import { BarChart3, TrendingUp, Trophy, DollarSign, Scale, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

  const stats = [
    {
      label: t("totalTrades"),
      value: total,
      sub: `${wins}W / ${losses}L / ${breakevens}BE`,
      icon: BarChart3,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: t("winRate"),
      value: `${winRate}%`,
      sub: null,
      icon: Trophy,
      color: winRate >= 50 ? "text-emerald-500" : "text-red-500",
      bg: winRate >= 50 ? "bg-emerald-500/10" : "bg-red-500/10",
    },
    {
      label: t("totalPnl"),
      value: totalPnl >= 0 ? `+$${totalPnl.toFixed(2)}` : `-$${Math.abs(totalPnl).toFixed(2)}`,
      sub: null,
      icon: DollarSign,
      color: totalPnl >= 0 ? "text-emerald-500" : "text-red-500",
      bg: totalPnl >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
    },
    {
      label: t("avgPnl"),
      value: avgPnl >= 0 ? `+$${avgPnl.toFixed(2)}` : `-$${Math.abs(avgPnl).toFixed(2)}`,
      sub: null,
      icon: TrendingUp,
      color: avgPnl >= 0 ? "text-emerald-500" : "text-red-500",
      bg: avgPnl >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
    },
    {
      label: t("payoffRatio"),
      value: payoffRatio !== null ? payoffRatio.toFixed(2) : "—",
      sub: t("payoffRatioSub"),
      icon: Scale,
      color:
        payoffRatio === null
          ? "text-muted-foreground"
          : payoffRatio >= 1
            ? "text-emerald-500"
            : "text-red-500",
      bg:
        payoffRatio === null
          ? "bg-muted"
          : payoffRatio >= 1
            ? "bg-emerald-500/10"
            : "bg-red-500/10",
    },
    {
      label: t("expectancyR"),
      value: avgR !== null ? `${avgR >= 0 ? "+" : ""}${avgR.toFixed(2)}R` : "—",
      sub: rCount > 0 ? t("expectancyRSub", { count: rCount }) : t("expectancyREmpty"),
      icon: Target,
      color:
        avgR === null
          ? "text-muted-foreground"
          : avgR >= 0
            ? "text-emerald-500"
            : "text-red-500",
      bg:
        avgR === null ? "bg-muted" : avgR >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((s) => (
        <Card key={s.label} className="border-border/60">
          <CardContent className="flex items-center gap-4 p-5">
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-lg",
                s.bg,
              )}
            >
              <s.icon className={cn("size-5", s.color)} />
            </div>
            <div>
              <p className="text-xl font-bold tabular-nums text-foreground">
                {s.value}
              </p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              {s.sub && (
                <p className="text-[11px] text-muted-foreground/70">{s.sub}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
