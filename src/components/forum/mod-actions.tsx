"use client";

import { useTransition } from "react";
import { EyeOff, Eye, Trash2 } from "lucide-react";
import { hidePost, unhidePost, deleteThread } from "@/actions/moderation";
import { Button } from "@/components/ui/button";

export function HidePostButton({
  postId,
  hidden,
}: {
  postId: string;
  hidden: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const action = hidden ? unhidePost : hidePost;
  const Icon = hidden ? Eye : EyeOff;
  const label = hidden ? "Hiện lại" : "Ẩn bài";

  return (
    <form
      action={(fd) => startTransition(() => action(fd))}
    >
      <input type="hidden" name="postId" value={postId} />
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        disabled={pending}
        className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <Icon className="size-3" />
        {label}
      </Button>
    </form>
  );
}

export function DeleteThreadButton({
  threadId,
  categorySlug,
}: {
  threadId: string;
  categorySlug: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => {
        if (!confirm("Xóa thread này? Thao tác không thể hoàn tác.")) return;
        startTransition(() => deleteThread(fd));
      }}
    >
      <input type="hidden" name="threadId" value={threadId} />
      <input type="hidden" name="categorySlug" value={categorySlug} />
      <Button
        type="submit"
        size="sm"
        variant="destructive"
        disabled={pending}
        className="h-7 gap-1 text-xs"
      >
        <Trash2 className="size-3" />
        Xóa thread
      </Button>
    </form>
  );
}
