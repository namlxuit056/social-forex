"use client";

import { Button } from "@/components/ui/button";
import { deleteAiArticle } from "./actions";

type Props = { id: string; confirmText: string; label: string };

export function DeleteArticleButton({ id, confirmText, label }: Props) {
  return (
    <form
      action={deleteAiArticle}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="ghost" className="text-destructive hover:text-destructive">
        {label}
      </Button>
    </form>
  );
}
