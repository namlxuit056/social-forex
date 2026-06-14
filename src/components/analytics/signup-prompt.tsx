"use client";

import { useEffect, useMemo } from "react";
import type { ComponentProps } from "react";
import { track } from "@vercel/analytics";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { buttonVariants } from "@/components/ui/button";
import {
  ANALYTICS_EVENTS,
  type AnalyticsProperties,
} from "@/lib/analytics-events";
import { trackInternalEvent } from "@/lib/internal-analytics";
import { cn } from "@/lib/utils";

type Props = {
  surface: string;
  title: string;
  description: string;
  ctaLabel: string;
  href?: ComponentPropsHref;
  className?: string;
};

type ComponentPropsHref = ComponentProps<typeof TrackedLink>["href"];

export function SignupPrompt({
  surface,
  title,
  description,
  ctaLabel,
  href = "/auth/register",
  className,
}: Props) {
  const eventProperties: AnalyticsProperties = useMemo(
    () => ({ surface }),
    [surface],
  );

  useEffect(() => {
    track(ANALYTICS_EVENTS.signupPromptView, eventProperties);
    trackInternalEvent(ANALYTICS_EVENTS.signupPromptView, eventProperties);
  }, [eventProperties]);

  return (
    <div
      className={cn(
        "rounded-xl border border-primary/25 bg-primary/8 p-4 ring-1 ring-primary/10",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-sm font-medium text-foreground">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        <TrackedLink
          href={href}
          eventName={ANALYTICS_EVENTS.signupPromptClick}
          eventProperties={eventProperties}
          className={cn(
            buttonVariants({ size: "sm" }),
            "w-full justify-center sm:w-auto",
          )}
        >
          {ctaLabel}
        </TrackedLink>
      </div>
    </div>
  );
}
