import type { MetadataRoute } from "next";
import { academyLessons } from "@/lib/content/academy";
import { routing } from "@/i18n/routing";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://socialforex.vn";

const staticPaths = [
  { path: "", changeFrequency: "daily" as const, priority: 1.0 },
  { path: "/quotes", changeFrequency: "hourly" as const, priority: 0.9 },
  { path: "/calendar", changeFrequency: "hourly" as const, priority: 0.9 },
  { path: "/chart", changeFrequency: "daily" as const, priority: 0.7 },
  { path: "/tools", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/forum", changeFrequency: "daily" as const, priority: 0.8 },
  { path: "/signals", changeFrequency: "daily" as const, priority: 0.8 },
  { path: "/leaderboard", changeFrequency: "daily" as const, priority: 0.6 },
  { path: "/academy", changeFrequency: "weekly" as const, priority: 0.8 },
  { path: "/resources", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/webinar", changeFrequency: "weekly" as const, priority: 0.5 },
  { path: "/brokers", changeFrequency: "monthly" as const, priority: 0.5 },
  { path: "/sentiment", changeFrequency: "daily" as const, priority: 0.5 },
  { path: "/heatmap", changeFrequency: "daily" as const, priority: 0.5 },
  { path: "/backtest", changeFrequency: "monthly" as const, priority: 0.4 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;

    for (const route of staticPaths) {
      entries.push({
        url: `${BASE}${prefix}${route.path}`,
        lastModified: now,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
      });
    }

    for (const lesson of academyLessons) {
      entries.push({
        url: `${BASE}${prefix}/academy/${lesson.slug}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  }

  return entries;
}
