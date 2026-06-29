"use client";

import { useActionState, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArticleEditor } from "@/components/articles/article-editor";
import { updateLessonAction } from "../actions";

type Props = {
  id: string;
  slug: string;
  locale: string;
  defaultTitle: string;
  defaultSummary: string;
  defaultBody: string;
};

export function LessonEditForm({ id, slug, locale, defaultTitle, defaultSummary, defaultBody }: Props) {
  const [state, formAction, pending] = useActionState(updateLessonAction, null);

  useEffect(() => {
    if (!state) return;
    if ("error" in state && state.error) toast.error(state.error);
    else if (state.ok) toast.success("Đã lưu thay đổi.");
  }, [state]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="slug" value={slug} />

      {state && "error" in state && state.error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="size-3.5 shrink-0" />
          {state.error}
        </div>
      )}

      <div>
        <Label htmlFor={`title-${locale}`}>Tiêu đề ({locale.toUpperCase()})</Label>
        <Input
          id={`title-${locale}`}
          name="title"
          defaultValue={defaultTitle}
          maxLength={140}
          className="mt-1.5"
          required
        />
      </div>

      <div>
        <Label htmlFor={`summary-${locale}`}>Tóm tắt ({locale.toUpperCase()})</Label>
        <Textarea
          id={`summary-${locale}`}
          name="summary"
          defaultValue={defaultSummary}
          maxLength={400}
          rows={3}
          className="mt-1.5"
          required
        />
      </div>

      <div>
        <Label className="mb-1.5 block">Nội dung ({locale.toUpperCase()})</Label>
        <ArticleEditor name="body" defaultValue={defaultBody} required />
      </div>

      <Button type="submit" disabled={pending} className="gap-2">
        {pending && <Loader2 className="size-3.5 animate-spin" />}
        {pending ? "Đang lưu..." : "Lưu thay đổi"}
      </Button>
    </form>
  );
}
