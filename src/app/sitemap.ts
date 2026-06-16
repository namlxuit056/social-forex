import type { MetadataRoute } from "next";
import { academyLessons } from "@/lib/content/academy";
import { routing } from "@/i18n/routing";
import { getSiteUrl } from "@/lib/site-url";
import { prisma } from "@/lib/prisma";

const BASE = getSiteUrl();

const staticPaths = [
  { path: "", changeFrequency: "daily" as const, priority: 1.0 },
  { path: "/start", changeFrequency: "weekly" as const, priority: 0.95 },
  { path: "/desk", changeFrequency: "hourly" as const, priority: 0.92 },
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
  { path: "/articles", changeFrequency: "daily" as const, priority: 0.75 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    {
      url: `${BASE}/llms.txt`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
    },
  ];

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

  // Published AI articles per locale
  const articles = await prisma.aiGeneratedArticle.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, locale: true, publishedAt: true, updatedAt: true },
    orderBy: { publishedAt: "desc" },
  });

  for (const article of articles) {
    const prefix =
      article.locale === routing.defaultLocale ? "" : `/${article.locale}`;
    entries.push({
      url: `${BASE}${prefix}/articles/${article.slug}`,
      lastModified: article.updatedAt,
      changeFrequency: "weekly",
      priority: 0.72,
    });
  }

  return entries;
}
