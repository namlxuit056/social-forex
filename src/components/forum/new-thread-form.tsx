"use client";

import { useFormState } from "react-dom";
import { createForumThread } from "@/actions/forum";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initial: { error?: string } | null = null;

export function NewThreadForm({ categorySlug }: { categorySlug: string }) {
  const [state, formAction] = useFormState(createForumThread, initial);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="categorySlug" value={categorySlug} />
      <div>
        <Label htmlFor="thread-title">Tiêu đề</Label>
        <Input
          id="thread-title"
          name="title"
          required
          minLength={2}
          maxLength={200}
          className="mt-1.5"
        />
      </div>
      <div>
        <Label htmlFor="thread-body">Nội dung mở đầu</Label>
        <Textarea
          id="thread-body"
          name="body"
          required
          rows={8}
          className="mt-1.5"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit">
        Đăng chủ đề
      </Button>
    </form>
  );
}
