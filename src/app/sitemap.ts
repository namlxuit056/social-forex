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
  { path: "/support", changeFrequency: "monthly" as const, priority: 0.4 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Trang tĩnh/bài hardcode không có ngày sửa thật → bỏ lastModified. Gửi `now` cho mọi URL
  // khiến Google coi lastmod là không đáng tin và bỏ qua cả lastmod của bài viết thật.
  const entries: MetadataRoute.Sitemap = [];

  // Fetch DB content in parallel
  const [articles, dbAcademyLessons] = await Promise.all([
    prisma.aiGeneratedArticle.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, locale: true, publishedAt: true, updatedAt: true },
      orderBy: { publishedAt: "desc" },
    }),
    // Không dùng distinct theo slug: mỗi bài có bản vi + en, cả hai đều phải vào sitemap.
    prisma.academyLesson.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, locale: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  // Bài hardcode được ưu tiên khi render (getAcademyLesson trước getDbLesson) — bỏ bản DB trùng slug.
  const hardcodedSlugs = new Set(academyLessons.map((l) => l.slug));

  for (const locale of routing.locales) {
    const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;

    for (const route of staticPaths) {
      entries.push({
        url: `${BASE}${prefix}${route.path}`,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
      });
    }

    for (const lesson of academyLessons) {
      entries.push({
        url: `${BASE}${prefix}/academy/${lesson.slug}`,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }

    // DB-generated academy lessons
    for (const lesson of dbAcademyLessons) {
      if (lesson.locale !== locale || hardcodedSlugs.has(lesson.slug)) continue;
      entries.push({
        url: `${BASE}${prefix}/academy/${lesson.slug}`,
        lastModified: lesson.updatedAt,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  }

  // Published AI articles per locale
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
