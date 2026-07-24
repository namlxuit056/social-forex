"use client";

import { useRef, useState, useTransition } from "react";
import { ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateImageUrlAction } from "../actions";

type Props = {
  slug: string;
  currentImageUrl: string | null;
};

export function ImageUrlForm({ slug, currentImageUrl }: Props) {
  const [value, setValue] = useState(currentImageUrl ?? "");
  const [preview, setPreview] = useState(currentImageUrl ?? "");
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("slug", slug);
    fd.set("imageUrl", value);
    startTransition(async () => {
      await updateImageUrlAction(fd);
      setPreview(value);
      toast.success("Đã cập nhật ảnh bìa.");
    });
  }

  return (
    <div className="rounded-lg border border-border/70 bg-card p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <ImageIcon className="size-4" />
        Ảnh bìa (dùng chung VI + EN)
      </h2>

      {preview && (
        <div className="mb-3 overflow-hidden rounded-md border border-border/50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview ảnh bìa"
            className="h-36 w-full object-cover"
            onError={() => setPreview("")}
          />
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="imageUrl" className="sr-only">
            URL ảnh bìa
          </Label>
          <Input
            id="imageUrl"
            name="imageUrl"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://..."
            className="font-mono text-xs"
          />
        </div>
        <Button type="submit" size="sm" disabled={pending} className="shrink-0 gap-1.5">
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          {pending ? "Đang lưu..." : "Lưu ảnh"}
        </Button>
      </form>
    </div>
  );
}
