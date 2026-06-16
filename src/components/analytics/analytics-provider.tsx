"use client";

import { Analytics } from "@vercel/analytics/next";

export function AnalyticsProvider() {
  return (
    <Analytics
      beforeSend={(event) => {
        if (event.url.includes("/admin") || event.url.includes("/api/")) {
          return null;
        }
        return event;
      }}
    />
  );
}
