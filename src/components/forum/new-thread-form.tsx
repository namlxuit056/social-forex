"use client";

import { useFormState } from "react-dom";
import { createForumThread } from "@/actions/forum";

const initial: { error?: string } | null = null;

export function NewThreadForm({ categorySlug }: { categorySlug: string }) {
  const [state, formAction] = useFormState(createForumThread, initial);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="categorySlug" value={categorySlug} />
      <label className="block text-sm">
        <span className="text-zinc-400">Tiêu đề</span>
        <input
          name="title"
          required
          minLength={2}
          maxLength={200}
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="text-zinc-400">Nội dung mở đầu</span>
        <textarea
          name="body"
          required
          rows={8}
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
        />
      </label>
      {state?.error && (
        <p className="text-sm text-rose-400">{state.error}</p>
      )}
      <button
        type="submit"
        className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500"
      >
        Đăng chủ đề
      </button>
    </form>
  );
}
