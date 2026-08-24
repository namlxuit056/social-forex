"use client";

import { useEffect, useState, useTransition } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
import { upsertEmotionDiaryEntry, deleteEmotionDiaryEntry } from "@/actions/journal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/empty-state";
import { cn } from "@/lib/utils";
import { classifyDiaryMood } from "@/lib/journal/emotion-diary-correlation";

export type EmotionDiaryEntryData = {
  id: string;
  date: string;
  note: string;
};

function todayLocalDate() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function JournalEmotionDiary({
  entries,
  locale,
}: {
  entries: EmotionDiaryEntryData[];
  locale: string;
}) {
  const t = useTranslations("journal");
  const [state, formAction, isPending] = useActionState(upsertEmotionDiaryEntry, null);
  const [editing, setEditing] = useState<EmotionDiaryEntryData | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (state?.ok) {
      startTransition(() => {
        setEditing(null);
        setFormKey((k) => k + 1);
      });
    }
  }, [state, startTransition]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("emotionDiaryFormTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form key={formKey} action={formAction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
              <div>
                <Label>{t("emotionDiaryDate")}</Label>
                <Input
                  name="date"
                  type="date"
                  required
                  defaultValue={editing?.date ?? todayLocalDate()}
                  max={todayLocalDate()}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>{t("emotionDiaryNote")}</Label>
                <Textarea
                  name="note"
                  rows={4}
                  required
                  defaultValue={editing?.note ?? ""}
                  placeholder={t("emotionDiaryNotePlaceholder")}
                  className="mt-1.5"
                />
              </div>
            </div>
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "…" : editing ? t("emotionDiarySaveEdit") : t("emotionDiarySave")}
              </Button>
              {editing && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditing(null);
                    setFormKey((k) => k + 1);
                  }}
                >
                  {t("emotionDiaryCancelEdit")}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {entries.length === 0 ? (
        <EmptyState
          title={t("emotionDiaryEmpty")}
          description={t("emotionDiaryEmptyHint")}
        />
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const mood = classifyDiaryMood(entry.note);
            return (
            <Card key={entry.id}>
              <CardContent className="flex items-start justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {new Date(entry.date).toLocaleDateString(locale, {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        timeZone: "UTC",
                      })}
                    </p>
                    {mood !== "neutral" && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          mood === "negative"
                            ? "bg-red-500/10 text-red-600 dark:text-red-400"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                        )}
                      >
                        {mood === "negative" ? t("emotionMoodNegative") : t("emotionMoodPositive")}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {entry.note}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => {
                      setEditing(entry);
                      setFormKey((k) => k + 1);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <form
                    action={deleteEmotionDiaryEntry}
                    onSubmit={(e) => {
                      if (!confirm(t("deleteConfirm"))) e.preventDefault();
                    }}
                  >
                    <input type="hidden" name="id" value={entry.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
