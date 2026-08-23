"use client";

import { useEffect, useRef } from "react";
import { track } from "@vercel/analytics";
import { Lock } from "lucide-react";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { buttonVariants } from "@/components/ui/button";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { trackInternalEvent } from "@/lib/internal-analytics";
import { cn } from "@/lib/utils";

type Props = {
  signalId: string;
  surface: "signals_list" | "signal_detail";
  variant?: "compact" | "detailed";
  title?: string;
  message: string;
  ctaLabel: string;
  winRateLabel?: string | null;
  className?: string;
};

export function VipSignalTeaser({
  signalId,
  surface,
  variant = "compact",
  title,
  message,
  ctaLabel,
  winRateLabel,
  className,
}: Props) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    const properties = { surface };
    track(ANALYTICS_EVENTS.signalVipBlocked, properties);
    trackInternalEvent(ANALYTICS_EVENTS.signalVipBlocked, properties);
  }, [surface, signalId]);

  const cta = (
    <TrackedLink
      href="/upgrade-vip"
      eventName={ANALYTICS_EVENTS.vipUpgradeClick}
      eventProperties={{ surface }}
      className={cn(
        buttonVariants({ variant: "default", size: "sm" }),
        "shrink-0 text-xs",
        variant === "detailed" && "min-h-9 w-full sm:w-auto",
      )}
    >
      {ctaLabel}
    </TrackedLink>
  );

  if (variant === "detailed") {
    return (
      <div
        className={cn(
          "flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between",
          className,
        )}
      >
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
          <div className="space-y-1">
            {title ? (
              <p className="text-sm font-medium text-foreground">{title}</p>
            ) : null}
            <p className="text-sm text-muted-foreground">{message}</p>
            {winRateLabel ? (
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {winRateLabel}
              </p>
            ) : null}
          </div>
        </div>
        {cta}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="space-y-0.5">
        <p className="text-sm text-amber-400/90">{message}</p>
        {winRateLabel ? (
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
            {winRateLabel}
          </p>
        ) : null}
      </div>
      {cta}
    </div>
  );
}
