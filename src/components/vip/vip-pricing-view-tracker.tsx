"use client";

import { useEffect, useRef } from "react";
import { track } from "@vercel/analytics";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { trackInternalEvent } from "@/lib/internal-analytics";

export function VipPricingViewTracker() {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    track(ANALYTICS_EVENTS.vipUpgradeView);
    trackInternalEvent(ANALYTICS_EVENTS.vipUpgradeView);
  }, []);

  return null;
}
