"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Upload lên Blob qua /api/articles/images/upload (endpoint dùng chung với CKEditor
 * image adapter), giữ URL/alt trong hidden input `imageUrl` / input `imageAlt`.
 */
export function ArticleThumbnailField({
  defaultImageUrl,
  defaultImageAlt,
}: {
  defaultImageUrl?: string | null;
  defaultImageAlt?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(defaultImageUrl ?? "");
  const [alt, setAlt] = useState(defaultImageAlt ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("upload", file);
      const res = await fetch(
        new URL("/api/articles/images/upload", window.location.origin).toString(),
        { method: "POST", body: fd, credentials: "include" },
      );
      let data: { url?: string; message?: string } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        /* non-JSON response */
      }
      if (!res.ok || !data.url) {
        setError(data.message ?? "Upload ảnh thất bại.");
        return;
      }
      setUrl(data.url);
    } catch {
      setError("Upload ảnh thất bại.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <Label>Ảnh thumbnail</Label>
      <input type="hidden" name="imageUrl" value={url} />
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      {url ? (
        <div className="mt-1.5 space-y-2">
          <div className="flex items-start gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- ảnh Blob ngoài domain, thumbnail nhỏ */}
            <img
              src={url}
              alt={alt || "Article thumbnail"}
              className="h-20 w-32 rounded-md border border-border object-cover"
            />
            <div className="flex flex-col gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className="gap-1.5"
              >
                {uploading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="size-3.5" />
                )}
                Đổi ảnh
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-destructive"
                onClick={() => setUrl("")}
              >
                <X className="size-3.5" />
                Xóa ảnh
              </Button>
            </div>
          </div>
          <Input
            name="imageAlt"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="Alt text cho ảnh (SEO)"
            className="h-8 text-xs"
          />
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="mt-1.5 gap-1.5"
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <ImagePlus className="size-3.5" />
          )}
          {uploading ? "Đang upload..." : "Upload thumbnail"}
        </Button>
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
