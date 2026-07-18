"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/**
 * Field upload ảnh chart cho journal — upload lên Blob qua /api/signal-images/upload
 * (endpoint dùng chung, xem trading-plan-form), giữ URL trong hidden input `imageUrl`.
 */
export function JournalImageField({
  defaultUrl,
}: {
  defaultUrl?: string | null;
}) {
  const t = useTranslations("journal");
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string>(defaultUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(
        new URL("/api/signal-images/upload", window.location.origin).toString(),
        { method: "POST", body: fd, credentials: "include" },
      );
      let data: { url?: string; message?: string } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        /* non-JSON response */
      }
      if (!res.ok || !data.url) {
        setError(data.message ?? t("chartImageError"));
        return;
      }
      setUrl(data.url);
    } catch {
      setError(t("chartImageError"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <Label>{t("chartImage")}</Label>
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
        <div className="mt-1.5 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- ảnh Blob ngoài domain, thumbnail nhỏ */}
          <img
            src={url}
            alt={t("chartImage")}
            className="h-14 w-20 rounded-md border border-border/60 object-cover"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-destructive"
            onClick={() => setUrl("")}
            aria-label={t("chartImageRemove")}
          >
            <X className="size-4" />
          </Button>
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
          {uploading ? t("chartImageUploading") : t("chartImageUpload")}
        </Button>
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
