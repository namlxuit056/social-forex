"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import {
  TrendingUp,
  Pencil,
  X,
  PartyPopper,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Minus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { saveCompoundPlan } from "@/actions/compound-plan";
import {
  computeCompoundPlanDailyBreakdown,
  computeCompoundPlanDailySummary,
  computeCompoundPlanProgress,
  type CompoundPlanConfig,
  type CompoundPlanTrade,
} from "@/lib/journal/compound-plan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type CompoundPlanData = {
  startingCapital: number;
  targetCapital: number;
  dailyTargetPercent: number;
  dailyStopPercent: number;
  startDate: string;
};

function fmtMoney(v: number) {
  const sign = v >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(v).toFixed(2)}`;
}

const DAILY_BREAKDOWN_COLLAPSED_COUNT = 10;

function DailyStatusIcon({ status }: { status: "target-hit" | "stop-hit" | "no-trade" | "in-progress" }) {
  if (status === "target-hit") {
    return <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />;
  }
  if (status === "stop-hit") {
    return <XCircle className="size-4 text-destructive" />;
  }
  return <Minus className="size-4 text-muted-foreground/50" />;
}

export function JournalCompoundPlanCard({
  plan,
  trades,
  locale,
}: {
  plan: CompoundPlanData | null;
  trades: CompoundPlanTrade[];
  locale: string;
}) {
  const t = useTranslations("journal");
  const [editing, setEditing] = useState(false);
  const [showAllDays, setShowAllDays] = useState(false);
  const [state, formAction, isPending] = useActionState(saveCompoundPlan, null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (state?.ok) startTransition(() => setEditing(false));
  }, [state?.ok]);

  const { progress, dailyBreakdown } = useMemo(() => {
    if (!plan) return { progress: null, dailyBreakdown: [] };
    const config: CompoundPlanConfig = {
      startingCapital: plan.startingCapital,
      targetCapital: plan.targetCapital,
      dailyTargetPercent: plan.dailyTargetPercent,
      dailyStopPercent: plan.dailyStopPercent,
      startDate: plan.startDate,
    };
    return {
      progress: computeCompoundPlanProgress(config, trades),
      dailyBreakdown: computeCompoundPlanDailyBreakdown(config, trades),
    };
  }, [plan, trades]);

  const dailySummary = useMemo(
    () => computeCompoundPlanDailySummary(dailyBreakdown),
    [dailyBreakdown],
  );

  const badge = useMemo(() => {
    if (!progress) return null;
    if (progress.todayStatus === "target-hit") {
      return { label: t("compoundPlanTargetHit"), cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" };
    }
    if (progress.todayStatus === "stop-hit") {
      return { label: t("compoundPlanStopHit"), cls: "bg-destructive/15 text-destructive" };
    }
    return { label: t("compoundPlanInProgress"), cls: "bg-muted text-muted-foreground" };
  }, [progress, t]);

  return (
    <Card className="border-border">
      <CardHeader className="flex-row items-center justify-between gap-3 pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <TrendingUp className="size-4 text-primary" />
          {t("compoundPlanTitle")}
        </CardTitle>
        <div className="flex items-center gap-2">
          {badge && !editing && (
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", badge.cls)}>
              {badge.label}
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
            {editing ? t("compoundPlanCancel") : plan ? t("compoundPlanEdit") : t("compoundPlanSet")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <form action={formAction} className="space-y-3">
            <p className="text-xs text-muted-foreground">{t("compoundPlanFormHint")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">{t("compoundPlanStartingCapital")} ($)</Label>
                <Input
                  name="startingCapital"
                  type="number"
                  step="any"
                  min="0"
                  defaultValue={plan?.startingCapital ?? progress?.currentCapital ?? ""}
                  className="mt-1 font-mono"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">{t("compoundPlanTargetCapital")} ($)</Label>
                <Input
                  name="targetCapital"
                  type="number"
                  step="any"
                  min="0"
                  defaultValue={plan?.targetCapital ?? ""}
                  className="mt-1 font-mono"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">{t("compoundPlanDailyTarget")} (%)</Label>
                <Input
                  name="dailyTargetPercent"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  defaultValue={plan?.dailyTargetPercent ?? ""}
                  className="mt-1 font-mono"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">{t("compoundPlanDailyStop")} (%)</Label>
                <Input
                  name="dailyStopPercent"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  defaultValue={plan?.dailyStopPercent ?? ""}
                  className="mt-1 font-mono"
                  required
                />
              </div>
            </div>
            {state?.error && <p className="text-xs text-destructive">{t("compoundPlanSaveError")}</p>}
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "…" : t("compoundPlanSave")}
            </Button>
          </form>
        ) : !progress ? (
          <p className="text-sm text-muted-foreground">{t("compoundPlanEmpty")}</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p className="text-[11px] text-muted-foreground">{t("compoundPlanCurrentCapital")}</p>
                <p className="font-mono text-sm font-medium">${progress.currentCapital.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{t("compoundPlanTodayTarget")}</p>
                <p className="font-mono text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  {fmtMoney(progress.todayTargetAmount)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{t("compoundPlanTodayStop")}</p>
                <p className="font-mono text-sm font-medium text-destructive">
                  {fmtMoney(-progress.todayStopAmount)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{t("compoundPlanTodayPnl")}</p>
                <p
                  className={cn(
                    "font-mono text-sm font-medium",
                    progress.todayPnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
                  )}
                >
                  {fmtMoney(progress.todayPnl)}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 rounded-lg bg-muted/30 p-2.5">
              <p className="text-[11px] text-muted-foreground">{t("compoundPlanPeriodTargetHint")}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <p className="text-[11px] text-muted-foreground">{t("compoundPlanWeeklyTarget")}</p>
                  <p
                    className={cn(
                      "font-mono text-sm font-medium",
                      progress.weeklyPnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
                    )}
                  >
                    {fmtMoney(progress.weeklyPnl)}
                    <span className="font-normal text-muted-foreground"> / </span>
                    {fmtMoney(progress.weeklyTargetAmount)}{" "}
                    <span className="font-normal text-muted-foreground">
                      ({progress.weeklyTargetPercent.toFixed(1)}%)
                    </span>
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[11px] text-muted-foreground">{t("compoundPlanMonthlyTarget")}</p>
                  <p
                    className={cn(
                      "font-mono text-sm font-medium",
                      progress.monthlyPnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
                    )}
                  >
                    {fmtMoney(progress.monthlyPnl)}
                    <span className="font-normal text-muted-foreground"> / </span>
                    {fmtMoney(progress.monthlyTargetAmount)}{" "}
                    <span className="font-normal text-muted-foreground">
                      ({progress.monthlyTargetPercent.toFixed(1)}%)
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{t("compoundPlanProgress")}</span>
                <span className="font-mono text-muted-foreground">
                  {Math.round(progress.progressPercent)}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/60 transition-all"
                  style={{ width: `${Math.round(progress.progressPercent)}%` }}
                />
              </div>
            </div>

            {progress.eta.kind === "reached" ? (
              <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <PartyPopper className="size-3.5" />
                {t("compoundPlanReached")}
              </p>
            ) : progress.eta.kind === "stalled" ? (
              <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-3.5" />
                {t("compoundPlanStalled")}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("compoundPlanEta", {
                  days: progress.eta.daysRemaining,
                  date: progress.eta.estimatedDate.toLocaleDateString(locale, {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    timeZone: "UTC",
                  }),
                })}
                {!progress.eta.basedOnActual && ` (${t("compoundPlanEtaEstimateOnly")})`}
              </p>
            )}

            <div className="space-y-1.5 border-t pt-3">
              <p className="text-xs font-medium">{t("compoundPlanDailyBreakdown")}</p>
              {dailyBreakdown.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("compoundPlanDailyBreakdownEmpty")}</p>
              ) : (
                <>
                  <p className="text-[11px] text-muted-foreground">
                    {t("compoundPlanDailySummary", {
                      targetHit: dailySummary.targetHitDays,
                      total: dailySummary.totalDays,
                      stopHit: dailySummary.stopHitDays,
                      streak: dailySummary.longestTargetStreak,
                    })}
                  </p>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-135 text-xs">
                      <thead>
                        <tr className="border-b bg-muted/30 text-left text-muted-foreground">
                          <th className="w-8 px-2 py-1.5" />
                          <th className="px-2 py-1.5">{t("compoundPlanDailyDate")}</th>
                          <th className="px-2 py-1.5 text-right">{t("compoundPlanDailyStart")}</th>
                          <th className="px-2 py-1.5 text-right">{t("compoundPlanDailyTargetCol")}</th>
                          <th className="px-2 py-1.5 text-right">{t("compoundPlanDailyStopCol")}</th>
                          <th className="px-2 py-1.5 text-right">{t("compoundPlanDailyPnl")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(showAllDays ? dailyBreakdown : dailyBreakdown.slice(0, DAILY_BREAKDOWN_COLLAPSED_COUNT)).map(
                          (day) => (
                            <tr key={day.date.toISOString()} className="border-b last:border-0">
                              <td className="px-2 py-1.5">
                                <DailyStatusIcon status={day.status} />
                              </td>
                              <td className="whitespace-nowrap px-2 py-1.5 font-mono">
                                {day.date.toLocaleDateString(locale, {
                                  day: "2-digit",
                                  month: "2-digit",
                                  timeZone: "UTC",
                                })}
                              </td>
                              <td className="px-2 py-1.5 text-right font-mono">${day.startCapital.toFixed(2)}</td>
                              <td className="px-2 py-1.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                                +${day.targetAmount.toFixed(2)}
                              </td>
                              <td className="px-2 py-1.5 text-right font-mono text-destructive">
                                -${day.stopAmount.toFixed(2)}
                              </td>
                              <td
                                className={cn(
                                  "px-2 py-1.5 text-right font-mono font-medium",
                                  day.pnl > 0
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : day.pnl < 0
                                      ? "text-destructive"
                                      : "text-muted-foreground",
                                )}
                              >
                                {fmtMoney(day.pnl)}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                  {dailyBreakdown.length > DAILY_BREAKDOWN_COLLAPSED_COUNT && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto gap-1 px-1.5 py-1 text-xs text-muted-foreground"
                      onClick={() => setShowAllDays((v) => !v)}
                    >
                      {showAllDays ? (
                        <>
                          <ChevronUp className="size-3.5" />
                          {t("compoundPlanDailyShowLess")}
                        </>
                      ) : (
                        <>
                          <ChevronDown className="size-3.5" />
                          {t("compoundPlanDailyShowMore", {
                            count: dailyBreakdown.length - DAILY_BREAKDOWN_COLLAPSED_COUNT,
                          })}
                        </>
                      )}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
