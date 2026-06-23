import { prisma } from "@/lib/prisma";

type RelatedArticle = {
  slug: string;
  title: string;
  keyword: string;
  summary: string;
};

/**
 * Find published articles related to a set of keywords.
 * Scores by keyword overlap with sourceKeywords, excluding the current article.
 */
export async function findRelatedArticles({
  keywords,
  locale,
  excludeSlug,
  limit = 3,
}: {
  keywords: string[];
  locale: string;
  excludeSlug?: string;
  limit?: number;
}): Promise<RelatedArticle[]> {
  if (keywords.length === 0) return [];

  // Find articles that share any of the given keywords
  const articles = await prisma.aiGeneratedArticle.findMany({
    where: {
      locale,
      status: "PUBLISHED",
      ...(excludeSlug ? { slug: { not: excludeSlug } } : {}),
      OR: [
        { keyword: { in: keywords, mode: "insensitive" } },
        { sourceKeywords: { hasSome: keywords } },
      ],
    },
    select: {
      slug: true,
      title: true,
      keyword: true,
      summary: true,
      sourceKeywords: true,
    },
    orderBy: { publishedAt: "desc" },
    take: 20,
  });

  // Score by keyword overlap
  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  const scored = articles
    .map((a) => {
      const allKeywords = [a.keyword, ...a.sourceKeywords].map((k) =>
        k.toLowerCase(),
      );
      const overlap = allKeywords.filter((k) =>
        lowerKeywords.includes(k),
      ).length;
      return { article: a, score: overlap };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => ({
    slug: s.article.slug,
    title: s.article.title,
    keyword: s.article.keyword,
    summary: s.article.summary,
  }));
}
