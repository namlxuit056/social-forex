"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateImageUrlAction } from "./actions";

export function EditImageForm({
  slug,
  currentImageUrl,
}: {
  slug: string;
  currentImageUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
      >
        ✏️ Sửa URL ảnh
      </Button>
    );
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    await updateImageUrlAction(formData);
    setPending(false);
    setOpen(false);
  }

  return (
    <form action={handleSubmit} className="mt-2 flex w-full flex-col gap-2">
      <input type="hidden" name="slug" value={slug} />
      {currentImageUrl && (
        <img
          src={currentImageUrl}
          alt="Current lesson image"
          className="h-24 w-full rounded border border-border/50 object-cover"
        />
      )}
      <Input
        name="imageUrl"
        defaultValue={currentImageUrl ?? ""}
        placeholder="https://... hoặc để trống để xóa ảnh"
        className="h-8 text-xs"
        autoFocus
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Đang lưu..." : "Lưu"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Huỷ
        </Button>
      </div>
    </form>
  );
}
