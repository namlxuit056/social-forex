"use client";

import { useState, useTransition } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Flag } from "lucide-react";
import { reportPost } from "@/actions/moderation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: { error?: string; ok?: boolean } | null = null;

export function ReportSignalCommentButton({ commentId }: { commentId: string }) {
  const t = useTranslations("forum");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(reportPost, initial);
  const [pending, startTransition] = useTransition();

  if (state?.ok) {
    return (
      <span className="text-xs text-muted-foreground">{t("reported")}</span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
      >
        <Flag className="size-3" />
        {tc("report")}
      </button>
    );
  }

  return (
    <form
      action={(fd) => startTransition(() => formAction(fd))}
      className="mt-2 flex flex-wrap items-end gap-2"
    >
      <input type="hidden" name="signalCommentId" value={commentId} />
      <div className="flex-1 min-w-[12rem]">
        <Label htmlFor={`sc-reason-${commentId}`} className="text-xs">
          {t("reportReason")}
        </Label>
        <Input
          id={`sc-reason-${commentId}`}
          name="reason"
          required
          minLength={3}
          maxLength={500}
          placeholder={t("reportPlaceholder")}
          className="h-8 text-xs"
        />
      </div>
      <Button type="submit" size="sm" variant="destructive" disabled={pending}>
        {t("reportSubmit")}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setOpen(false)}
      >
        {tc("cancel")}
      </Button>
      {state?.error && (
        <p className="w-full text-xs text-destructive">{state.error}</p>
      )}
    </form>
  );
}
