"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Target, Check, Pencil, X } from "lucide-react";
import { saveTradingGoal } from "@/actions/trading-goal";
import {
  computeGoalProgress,
  goalMonthStart,
  tradesInGoalMonth,
  type GoalMetric,
  type GoalTrade,
} from "@/lib/journal/goal-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type TradingGoalData = {
  targetWinRate: number | null;
  targetAvgR: number | null;
  targetNetPnl: number | null;
  targetTrades: number | null;
  note: string | null;
};

const METRIC_ORDER: GoalMetric[] = ["winRate", "avgR", "netPnl", "trades"];

function fmt(metric: GoalMetric, v: number): string {
  if (metric === "winRate") return `${v.toFixed(v % 1 === 0 ? 0 : 1)}%`;
  if (metric === "avgR") return `${v >= 0 ? "+" : ""}${v.toFixed(2)}R`;
  if (metric === "netPnl") return `${v >= 0 ? "+" : "-"}$${Math.abs(v).toFixed(2)}`;
  return String(Math.round(v));
}

export function JournalGoalTracker({
  goal,
  trades,
  locale,
}: {
  goal: TradingGoalData | null;
  trades: GoalTrade[];
  locale: string;
}) {
  const t = useTranslations("journal");
  const [editing, setEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(saveTradingGoal, null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (state?.ok) startTransition(() => setEditing(false));
  }, [state?.ok]);

  const monthStart = useMemo(() => goalMonthStart(new Date()), []);
  const monthLabel = monthStart.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const progress = useMemo(() => {
    if (!goal) return null;
    const monthTrades = tradesInGoalMonth(trades, monthStart);
    return computeGoalProgress(goal, monthTrades);
  }, [goal, trades, monthStart]);

  const hasGoal = progress !== null && progress.totalCount > 0;

  const metricLabel: Record<GoalMetric, string> = {
    winRate: t("goalWinRate"),
    avgR: t("goalAvgR"),
    netPnl: t("goalNetPnl"),
    trades: t("goalTrades"),
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="flex-row items-center justify-between gap-3 pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <Target className="size-4 text-primary" />
          {t("goalTitle", { month: monthLabel })}
        </CardTitle>
        <div className="flex items-center gap-2">
          {hasGoal && !editing && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                progress!.metCount === progress!.totalCount
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {t("goalMetCount", { met: progress!.metCount, total: progress!.totalCount })}
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto gap-1.5 px-2 py-1 text-xs"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? <X className="size-3.5" /> : <Pencil className="size-3.5" />}
            {editing ? t("goalCancel") : hasGoal ? t("goalEdit") : t("goalSet")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <form action={formAction} className="space-y-3">
            <p className="text-xs text-muted-foreground">{t("goalFormHint")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">{t("goalWinRate")} (%)</Label>
                <Input
                  name="targetWinRate"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  defaultValue={goal?.targetWinRate ?? ""}
                  className="mt-1 font-mono"
                />
              </div>
              <div>
                <Label className="text-xs">{t("goalAvgR")} (R)</Label>
                <Input
                  name="targetAvgR"
                  type="number"
                  step="0.1"
                  defaultValue={goal?.targetAvgR ?? ""}
                  className="mt-1 font-mono"
                />
              </div>
              <div>
                <Label className="text-xs">{t("goalNetPnl")} ($)</Label>
                <Input
                  name="targetNetPnl"
                  type="number"
                  step="any"
                  defaultValue={goal?.targetNetPnl ?? ""}
                  className="mt-1 font-mono"
                />
              </div>
              <div>
                <Label className="text-xs">{t("goalTrades")}</Label>
                <Input
                  name="targetTrades"
                  type="number"
                  step="1"
                  min="0"
                  defaultValue={goal?.targetTrades ?? ""}
                  className="mt-1 font-mono"
                />
              </div>
            </div>
            {state?.error && <p className="text-xs text-destructive">{t("goalSaveError")}</p>}
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "…" : t("goalSave")}
            </Button>
          </form>
        ) : !hasGoal ? (
          <p className="text-sm text-muted-foreground">{t("goalEmpty")}</p>
        ) : (
          <div className="space-y-3">
            {METRIC_ORDER.filter((m) => progress!.items.some((i) => i.metric === m)).map((m) => {
              const item = progress!.items.find((i) => i.metric === m)!;
              return (
                <div key={m} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 font-medium">
                      {item.met && <Check className="size-3.5 text-emerald-500" />}
                      {metricLabel[m]}
                    </span>
                    <span className="font-mono text-muted-foreground">
                      <span className={item.met ? "text-emerald-500" : "text-foreground"}>
                        {fmt(m, item.actual)}
                      </span>{" "}
                      / {fmt(m, item.target)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        item.met ? "bg-emerald-500" : "bg-primary/60",
                      )}
                      style={{ width: `${Math.round(item.ratio * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
