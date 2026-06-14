"use client";

import type { ComponentPropsWithoutRef, MouseEvent } from "react";
import { track } from "@vercel/analytics";
import { Link } from "@/i18n/navigation";
import type {
  AnalyticsEventName,
  AnalyticsProperties,
} from "@/lib/analytics-events";
import { trackInternalEvent } from "@/lib/internal-analytics";

type LinkProps = ComponentPropsWithoutRef<typeof Link>;

type TrackedLinkProps = LinkProps & {
  eventName: AnalyticsEventName;
  eventProperties?: AnalyticsProperties;
};

type TrackedAnchorProps = ComponentPropsWithoutRef<"a"> & {
  eventName: AnalyticsEventName;
  eventProperties?: AnalyticsProperties;
};

export function TrackedLink({
  eventName,
  eventProperties,
  onClick,
  ...props
}: TrackedLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    track(eventName, eventProperties);
    trackInternalEvent(eventName, eventProperties);
    onClick?.(event);
  }

  return <Link {...props} onClick={handleClick} />;
}

export function TrackedAnchor({
  eventName,
  eventProperties,
  onClick,
  ...props
}: TrackedAnchorProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    track(eventName, eventProperties);
    trackInternalEvent(eventName, eventProperties);
    onClick?.(event);
  }

  return <a {...props} onClick={handleClick} />;
}
