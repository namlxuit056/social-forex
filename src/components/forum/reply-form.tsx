"use client";

import { useFormState } from "react-dom";
import { useEffect, useRef } from "react";
import { replyForumThread } from "@/actions/forum";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initial: { error?: string; ok?: boolean } | null = null;

export function ReplyForm({
  threadId,
  categorySlug,
}: {
  threadId: string;
  categorySlug: string;
}) {
  const [state, formAction] = useFormState(replyForumThread, initial);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
    }
  }, [state?.ok]);

  return (
    <form ref={ref} action={formAction} className="space-y-3">
      <input type="hidden" name="threadId" value={threadId} />
      <input type="hidden" name="categorySlug" value={categorySlug} />
      <div>
        <Label htmlFor="reply-body">Trả lời</Label>
        <Textarea
          id="reply-body"
          name="body"
          required
          rows={4}
          className="mt-1.5"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" variant="outline" size="sm">
        Gửi
      </Button>
    </form>
  );
}
