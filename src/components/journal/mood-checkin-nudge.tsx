"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { X, AlertTriangle } from "lucide-react";
import { setMoodCheckin } from "@/actions/mood";
import { MOODS, MOOD_EMOJI, isNegativeMood, type Mood } from "@/lib/journal/mood";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "mood-nudge-dismissed";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === todayKey();
  } catch {
    return false;
  }
}

function writeDismissed() {
  try {
    sessionStorage.setItem(DISMISS_KEY, todayKey());
  } catch {
    // ignore
  }
}

/** Site-wide 1-tap mood check-in. Prompts once per day until answered; if the
 * trader marks a negative mood, shows a persistent (session-dismissible) reminder. */
export function MoodCheckinNudge() {
  const t = useTranslations("journal");
  const [mood, setMood] = useState<Mood | null | undefined>(undefined);
  const [dismissed, setDismissed] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    fetch("/api/journal/mood-checkin")
      .then((r) => (r.ok ? r.json() : { mood: null }))
      .then((d: { mood: string | null }) => {
        if (!alive) return;
        setMood((d.mood as Mood | null) ?? null);
        setDismissed(readDismissed());
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
    startTransition(async () => {
      const res = await setMoodCheckin(next);
      if (res?.error) {
        setMood(null); // let them retry
      }
    });
  }

  function dismiss() {
    writeDismissed();
    setDismissed(true);
  }

  if (mood === undefined) return null;

  // Answered positively → nothing to show.
  if (mood === "good" || mood === "ok") return null;

  // Dismissed for the session (prompt or reminder) → stay out of the way.
  if (dismissed) return null;

  const showReminder = isNegativeMood(mood);

  return (
    <div className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-sm sm:inset-x-auto sm:left-5 sm:bottom-20">
      <div
        className={cn(
          "rounded-xl border p-3 shadow-lg backdrop-blur",
          showReminder
            ? "border-amber-500/40 bg-amber-50/95 text-amber-900 dark:bg-amber-950/90 dark:text-amber-100"
            : "border-border bg-card",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            {showReminder && <AlertTriangle className="size-4 shrink-0" />}
            {showReminder ? t("moodReminderTitle") : t("moodPrompt")}
          </p>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {showReminder ? (
          <p className="mt-1 text-xs">{t("moodReminderBody")}</p>
        ) : (
          <div className="mt-2 flex gap-1.5">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                disabled={isPending}
                onClick={() => choose(m)}
                className="flex flex-1 flex-col items-center gap-0.5 rounded-lg border border-border py-1.5 text-xs transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50"
              >
                <span className="text-lg leading-none">{MOOD_EMOJI[m]}</span>
                {t(
                  m === "good"
                    ? "moodGood"
                    : m === "ok"
                      ? "moodOk"
                      : m === "tired"
                        ? "moodTired"
                        : "moodStressed",
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
