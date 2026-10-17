"use client";

import { useEffect, useState, useTransition } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
import { saveJournalLesson, deleteJournalLesson } from "@/actions/journal";
import { JournalImageField } from "./journal-image-field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/empty-state";

export type JournalLessonData = {
  id: string;
  body: string;
  imageUrl: string | null;
  createdAt: string;
};

export function JournalLessons({
  lessons,
  locale,
}: {
  lessons: JournalLessonData[];
  locale: string;
}) {
  const t = useTranslations("journal");
  const [state, formAction, isPending] = useActionState(saveJournalLesson, null);
  const [editing, setEditing] = useState<JournalLessonData | null>(null);
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

  function resetForm() {
    setEditing(null);
    setFormKey((k) => k + 1);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("lessonsFormTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form key={formKey} action={formAction} className="space-y-4">
            {editing && <input type="hidden" name="lessonId" value={editing.id} />}
            <div>
              <Label>{t("lessonBody")}</Label>
              <Textarea
                name="body"
                rows={4}
                required
                defaultValue={editing?.body ?? ""}
                placeholder={t("lessonBodyPlaceholder")}
                className="mt-1.5"
              />
            </div>
            <JournalImageField defaultUrl={editing?.imageUrl} />
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "…" : editing ? t("lessonSaveEdit") : t("lessonSave")}
              </Button>
              {editing && (
                <Button type="button" variant="ghost" onClick={resetForm}>
                  {t("lessonCancelEdit")}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {lessons.length === 0 ? (
        <EmptyState title={t("lessonEmpty")} description={t("lessonEmptyHint")} />
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson) => (
            <Card key={lesson.id}>
              <CardContent className="flex items-start justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">
                    {new Date(lesson.createdAt).toLocaleDateString(locale, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                    {lesson.body}
                  </p>
                  {lesson.imageUrl && (
                    <a
                      href={lesson.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- ảnh Blob ngoài domain */}
                      <img
                        src={lesson.imageUrl}
                        alt=""
                        className="h-24 w-36 rounded-md border border-border object-cover"
                      />
                    </a>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => {
                      setEditing(lesson);
                      setFormKey((k) => k + 1);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <form
                    action={deleteJournalLesson}
                    onSubmit={(e) => {
                      if (!confirm(t("deleteConfirm"))) e.preventDefault();
                    }}
                  >
                    <input type="hidden" name="id" value={lesson.id} />
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
          ))}
        </div>
      )}
    </div>
  );
}
