"use client";

import { useTranslations } from "next-intl";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div className={cn("flex flex-wrap gap-2", className)}>
      {imageUrls.map((url) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-md border border-border/60 ring-offset-background transition hover:ring-2 hover:ring-primary/30"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- remote blob URLs */}
          <img
            src={url}
            alt=""
            className={cn(h, maxW, "w-auto object-cover")}
            loading="lazy"
          />
        </a>
      ))}
    </div>
  );
}
