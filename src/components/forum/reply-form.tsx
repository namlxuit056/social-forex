"use client";

import { useFormState } from "react-dom";
import { useEffect, useRef } from "react";
import { replyForumThread } from "@/actions/forum";

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
      <label className="block text-sm">
        <span className="text-zinc-400">Trả lời</span>
        <textarea
          name="body"
          required
          rows={4}
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
        />
      </label>
      {state?.error && (
        <p className="text-sm text-rose-400">{state.error}</p>
      )}
      <button
        type="submit"
        className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
      >
        Gửi
      </button>
    </form>
  );
}
