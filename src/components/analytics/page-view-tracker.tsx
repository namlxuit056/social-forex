"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";
import type { AnalyticsEventName, AnalyticsProperties } from "@/lib/analytics-events";

type Props = {
  eventName: AnalyticsEventName;
  properties?: AnalyticsProperties;
};

/** Drop this into any server-rendered page to fire a one-shot Vercel Analytics event on mount. */
export function PageViewTracker({ eventName, properties }: Props) {
  useEffect(() => {
    track(eventName, properties);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
