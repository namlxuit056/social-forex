"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function ImageLightbox({
  url,
  onClose,
  dialogLabel,
  closeLabel,
}: {
  url: string;
  onClose: () => void;
  dialogLabel: string;
  closeLabel: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 p-4 pt-14"
      role="dialog"
      aria-modal="true"
      aria-label={dialogLabel}
      onClick={onClose}
    >
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="absolute right-3 top-3 z-101 size-10 shrink-0 rounded-full shadow-lg"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label={closeLabel}
      >
        <X className="size-5" />
      </Button>
      {/* eslint-disable-next-line @next/next/no-img-element -- remote blob URLs */}
      <img
        src={url}
        alt=""
        className="max-h-[min(100dvh-5rem,100%)] max-w-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body,
  );
}

export function SignalImageGallery({
  imageUrls,
  imageCount,
  masked,
  className,
  size = "md",
}: {
  imageUrls: string[];
  /** Total images on signal (for VIP locked hint) */
  imageCount: number;
  masked: boolean;
  className?: string;
  size?: "sm" | "md";
}) {
  const t = useTranslations("signals");
  const tc = useTranslations("common");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const closeLightbox = useCallback(() => setLightboxUrl(null), []);

  if (masked && imageCount > 0 && imageUrls.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-sm text-amber-200/90",
          className,
        )}
      >
        <ImageIcon className="size-4 shrink-0" />
        <span>{t("vipImagesLocked", { count: imageCount })}</span>
      </div>
    );
  }

  if (imageUrls.length === 0) return null;

  const h = size === "sm" ? "h-16 sm:h-20" : "h-20 sm:h-24";
  const maxW = size === "sm" ? "max-w-[100px] sm:max-w-[120px]" : "max-w-[120px] sm:max-w-[160px]";

  return (
    <>
      <div className={cn("flex flex-wrap gap-2", className)}>
        {imageUrls.map((url) => (
          <button
            key={url}
            type="button"
            onClick={() => setLightboxUrl(url)}
            className={cn(
              "block overflow-hidden rounded-md border border-border/60 ring-offset-background transition hover:ring-2 hover:ring-primary/30",
              "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- remote blob URLs */}
            <img
              src={url}
              alt=""
              className={cn(h, maxW, "w-auto object-cover")}
              loading="lazy"
            />
          </button>
        ))}
      </div>
      {lightboxUrl ? (
        <ImageLightbox
          url={lightboxUrl}
          onClose={closeLightbox}
          dialogLabel={t("imageViewerDialog")}
          closeLabel={tc("close")}
        />
      ) : null}
    </>
  );
}
