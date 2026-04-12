import type { MetadataRoute } from "next";
import { academyLessons } from "@/lib/content/academy";

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://socialforex.vn";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/quotes`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE}/calendar`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE}/chart`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE}/tools`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/forum`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/signals`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/leaderboard`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${BASE}/academy`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/resources`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/webinar`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE}/brokers`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/sentiment`, lastModified: now, changeFrequency: "daily", priority: 0.5 },
    { url: `${BASE}/heatmap`, lastModified: now, changeFrequency: "daily", priority: 0.5 },
    { url: `${BASE}/backtest`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  const academyRoutes: MetadataRoute.Sitemap = academyLessons.map((l) => ({
    url: `${BASE}/academy/${l.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...academyRoutes];
}
