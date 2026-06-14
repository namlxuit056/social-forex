"use client";

import type {
  AnalyticsEventName,
  AnalyticsProperties,
} from "@/lib/analytics-events";

const VISITOR_KEY = "social_forex_visitor_id";

function createVisitorId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function getVisitorId() {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const next = createVisitorId();
    localStorage.setItem(VISITOR_KEY, next);
    return next;
  } catch {
    return undefined;
  }
}

function currentPath() {
  if (typeof window === "undefined") return "/";
  return window.location.pathname || "/";
}

export function trackInternalEvent(
  eventName: AnalyticsEventName,
  properties: AnalyticsProperties = {},
) {
  if (typeof window === "undefined") return;

  const payload = {
    type: "funnel_event",
    eventName,
    properties,
    visitorId: getVisitorId(),
    path: currentPath(),
    fullPath: `${window.location.pathname}${window.location.search}`,
    referrer: document.referrer || undefined,
  };
  const blob = new Blob([JSON.stringify(payload)], {
    type: "application/json",
  });

  if (typeof navigator.sendBeacon === "function") {
    if (navigator.sendBeacon("/api/analytics/track", blob)) return;
  }

  void fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  });
}
