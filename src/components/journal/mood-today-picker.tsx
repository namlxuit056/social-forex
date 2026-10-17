"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { setMoodCheckin } from "@/actions/mood";
import { MOODS, MOOD_EMOJI, isNegativeMood, type Mood } from "@/lib/journal/mood";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const LABEL_KEY: Record<Mood, string> = {
  good: "moodGood",
  ok: "moodOk",
  tired: "moodTired",
  stressed: "moodStressed",
};

/** Inline 1-tap mood check-in for the journal Emotion tab — shows/updates today's mood. */
export function MoodTodayPicker() {
  const t = useTranslations("journal");
  const [mood, setMood] = useState<Mood | null | undefined>(undefined);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    fetch("/api/journal/mood-checkin")
      .then((r) => (r.ok ? r.json() : { mood: null }))
      .then((d: { mood: string | null }) => {
        if (alive) setMood((d.mood as Mood | null) ?? null);
      })
      .catch(() => {
        if (alive) setMood(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  function choose(next: Mood) {
    setMood(next);
    startTransition(() => {
      void setMoodCheckin(next);
    });
  }

  if (mood === undefined) return null;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 py-4">
        <span className="text-sm font-medium">{t("moodChangeToday")}</span>
        <div className="flex flex-wrap gap-1.5">
          {MOODS.map((m) => (
            <button
              key={m}
              type="button"
              disabled={isPending}
              onClick={() => choose(m)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors disabled:opacity-50",
                mood === m
                  ? isNegativeMood(m)
                    ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    : "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              <span className="text-base leading-none">{MOOD_EMOJI[m]}</span>
              {t(LABEL_KEY[m])}
            </button>
          ))}
        </div>
        {isNegativeMood(mood) && (
          <p className="w-full text-xs text-amber-600 dark:text-amber-400">
            {t("moodReminderBody")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
