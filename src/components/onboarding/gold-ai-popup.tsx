"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { BarChart3, Bot, ShieldCheck, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "social-forex:gold-ai-popup:v1";

export function GoldAiPopup() {
  const t = useTranslations("goldAiPopup");
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "dismissed");
    } catch {
      /* localStorage may be unavailable in private contexts */
    }
    setOpen(false);
  }, []);

  useEffect(() => {
    if (pathname.includes("/u/")) return;

    try {
      if (window.localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }

    const timer = window.setTimeout(() => setOpen(true), 900);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dismiss, open]);

  if (!open) return null;

  const chartHref = `/${locale}/chart?symbol=XAUUSD`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 px-4 py-5 backdrop-blur-sm sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="gold-ai-popup-title"
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
      >
        <div className="relative border-b border-border bg-muted/25 px-5 py-4">
          <button
            type="button"
            onClick={dismiss}
            className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label={t("closeAria")}
          >
            <X className="size-4" aria-hidden />
          </button>
          <div className="flex items-start gap-3 pr-9">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-yellow-500/25 bg-yellow-500/10 text-yellow-600 dark:text-yellow-300">
              <Sparkles className="size-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-yellow-600 dark:text-yellow-300">
                {t("eyebrow")}
              </p>
              <h2
                id="gold-ai-popup-title"
                className="mt-1 font-heading text-xl font-semibold leading-tight text-foreground"
              >
                {t("title")}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t("description")}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <FeatureItem icon={<BarChart3 />} label={t("featureTrend")} />
            <FeatureItem icon={<ShieldCheck />} label={t("featureRisk")} />
            <FeatureItem icon={<Bot />} label={t("featureSignal")} />
          </div>

          <div className="rounded-lg border border-border/70 bg-background/60 px-3 py-2.5">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("disclaimer")}
            </p>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={dismiss}>
              {t("secondaryCta")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                dismiss();
                window.location.href = chartHref;
              }}
            >
                <Sparkles className="size-4" aria-hidden />
                {t("primaryCta")}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureItem({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <div className="flex min-h-20 flex-col justify-between rounded-lg border border-border/70 bg-background/50 p-3">
      <span className="text-primary [&_svg]:size-4" aria-hidden>
        {icon}
      </span>
      <span className="mt-2 text-xs font-medium leading-snug text-foreground">
        {label}
      </span>
    </div>
  );
}
