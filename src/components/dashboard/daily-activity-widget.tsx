"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BookOpen, ClipboardCheck, Flame, Radio } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DailyActivityData = {
  journal: boolean;
  plan: boolean;
  signal: boolean;
  streaks: { journal: number; plan: number; signal: number };
  xp: number;
  todayCounts: { journals: number; signals: number };
};

function getLevel(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

function getXpProgress(xp: number): number {
  return xp % 100;
}

export function DailyActivityWidget() {
  const t = useTranslations("gamification");
  const [data, setData] = useState<DailyActivityData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchActivity() {
      try {
        const res = await fetch("/api/daily-activity");
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        // Silent fail
      }
    }

    fetchActivity();
    const interval = setInterval(fetchActivity, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!data) return null;

  const level = getLevel(data.xp);
  const xpProgress = getXpProgress(data.xp);

  const activities = [
    {
      label: t("journalDone"),
      pending: t("journalPending"),
      done: data.journal,
      icon: BookOpen,
      streak: data.streaks.journal,
    },
    {
      label: t("planDone"),
      pending: t("planPending"),
      done: data.plan,
      icon: ClipboardCheck,
      streak: data.streaks.plan,
    },
    {
      label: t("signalDone"),
      pending: t("signalPending"),
      done: data.signal,
      icon: Radio,
      streak: data.streaks.signal,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t("dailyActivity")}</CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t("level")}</span>
            <span className="font-bold text-primary">{level}</span>
            <div className="h-1.5 w-16 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {activities.map((a) => {
            const Icon = a.icon;
            return (
              <div
                key={a.label}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors",
                  a.done
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-border/60 bg-muted/20",
                )}
              >
                <Icon
                  className={cn(
                    "size-5",
                    a.done ? "text-green-500" : "text-muted-foreground",
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-medium",
                    a.done ? "text-green-600 dark:text-green-400" : "text-muted-foreground",
                  )}
                >
                  {a.done ? a.label : a.pending}
                </span>
                {a.streak > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-orange-500">
                    <Flame className="size-3" />
                    {a.streak}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {t("totalXp")}: <span className="font-semibold text-foreground">{data.xp}</span>
          </span>
          <span>
            {data.todayCounts.journals > 0 && `${data.todayCounts.journals} journal `}
            {data.todayCounts.signals > 0 && `${data.todayCounts.signals} signal`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
