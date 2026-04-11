"use client";

import { useFormState } from "react-dom";
import { useEffect, useRef } from "react";
import { sendDirectMessage } from "@/actions/messages";

const initial: { error?: string; ok?: boolean } | null = null;

export function DmCompose({ recipientId }: { recipientId: string }) {
  const [state, formAction] = useFormState(sendDirectMessage, initial);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
    }
  }, [state?.ok]);

  return (
    <form ref={ref} action={formAction} className="space-y-2">
      <input type="hidden" name="recipientId" value={recipientId} />
      <textarea
        name="body"
        required
        rows={3}
        placeholder="Nhập tin nhắn…"
        className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
      />
      {state?.error && (
        <p className="text-sm text-rose-400">{state.error}</p>
      )}
      <button
        type="submit"
        className="rounded bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500"
      >
        Gửi
      </button>
    </form>
  );
}
