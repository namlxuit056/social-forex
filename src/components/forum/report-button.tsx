"use client";

import { useState, useTransition } from "react";
import { useActionState } from "react";
import { Flag } from "lucide-react";
import { reportPost } from "@/actions/moderation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: { error?: string; ok?: boolean } | null = null;

export function ReportButton({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(reportPost, initial);
  const [pending, startTransition] = useTransition();

  if (state?.ok) {
    return (
      <span className="text-xs text-muted-foreground">
        Đã gửi báo cáo
      </span>
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
        Báo cáo
      </button>
    );
  }

  return (
    <form
      action={(fd) => startTransition(() => formAction(fd))}
      className="mt-2 flex flex-wrap items-end gap-2"
    >
      <input type="hidden" name="postId" value={postId} />
      <div className="flex-1">
        <Label htmlFor={`reason-${postId}`} className="text-xs">Lý do</Label>
        <Input
          id={`reason-${postId}`}
          name="reason"
          required
          minLength={3}
          maxLength={500}
          placeholder="Spam, vi phạm quy tắc…"
          className="h-8 text-xs"
        />
      </div>
      <Button type="submit" size="sm" variant="destructive" disabled={pending}>
        Gửi
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setOpen(false)}
      >
        Hủy
      </Button>
      {state?.error && (
        <p className="w-full text-xs text-destructive">{state.error}</p>
      )}
    </form>
  );
}
