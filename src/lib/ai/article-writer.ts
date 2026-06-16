import { z } from "zod";
import { createAiClient, resolveAiProvider } from "@/lib/ai/provider";
import { prisma } from "@/lib/prisma";

type ArticleLocale = "vi" | "en";

const articleSchema = z.object({
  title: z.string().min(8).max(140),
  summary: z.string().min(30).max(280),
  metaDescription: z.string().min(50).max(180),
  body: z.string().min(900).max(9000),
});

function stripTags(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function extractTitleWords(title: string) {
  const stop = new Set([
    "the",
    "and",
    "for",
    "with",
    "from",
    "this",
    "that",
    "forex",
    "market",
    "markets",
    "trading",
    "price",
    "news",
    "today",
    "mới",
    "nhất",
    "và",
    "của",
    "cho",
    "với",
    "giá",
    "thị",
    "trường",
  ]);

  return stripTags(title)
    .split(/[^A-Za-z0-9]+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !stop.has(word.toLowerCase()));
}

async function fetchGoogleNewsTitles(seedKeywords: string[]) {
  const query = encodeURIComponent(
    `(${seedKeywords.slice(0, 8).join(" OR ")}) when:7d`,
  );
  const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
  const res = await fetch(url, {
    headers: { "user-agent": "SocialForexBot/1.0" },
    next: { revalidate: 60 * 60 },
  });
  if (!res.ok) return { titles: [], source: url };

  const xml = await res.text();
  const titles = [...xml.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/g)]
    .map((match) => stripTags(match[1] ?? match[2] ?? ""))
    .filter((title) => title && !title.includes("Google News"))
    .slice(0, 30);
  return { titles, source: url };
}

export async function getTrendingForexKeywords(seedKeywords: string[]) {
  const { titles, source } = await fetchGoogleNewsTitles(seedKeywords);
  const counts = new Map<string, number>();

  for (const seed of seedKeywords) {
    counts.set(seed, (counts.get(seed) ?? 0) + 2);
  }
  for (const title of titles) {
    for (const word of extractTitleWords(title)) {
      const normalized = word.toUpperCase() === word ? word : word.toLowerCase();
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }

  const keywords = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([keyword]) => keyword)
    .filter((keyword) => keyword.length <= 48)
    .slice(0, 12);

  return { keywords, trendSource: source };
}

async function uniqueSlug(base: string, locale: ArticleLocale) {
  let slug = base || `forex-article-${Date.now()}`;
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    const existing = await prisma.aiGeneratedArticle.findUnique({
      where: { locale_slug: { locale, slug: candidate } },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  return `${slug}-${Date.now()}`;
}

function buildArticlePrompt(keyword: string, locale: ArticleLocale) {
  const language =
    locale === "vi"
      ? "Vietnamese, natural for beginner and intermediate forex traders in Vietnam"
      : "English, natural for beginner and intermediate forex traders";

  return `Write an educational SEO article for Social Forex.

Keyword: ${keyword}
Language: ${language}

Rules:
- Return valid JSON only: title, summary, metaDescription, body.
- Body must be markdown with H2 sections.
- Explain context, why traders care, practical checklist, common mistakes, and risk management.
- Do not give direct buy/sell recommendations.
- Do not promise profit, certainty, signal accuracy, or guaranteed outcomes.
- Include an educational risk disclaimer in the final section.
- Keep tone practical, clear, and not clickbait.
- Mention that readers should verify data on their broker/calendar/chart.
- Avoid copying news articles. Summarize generally and teach process.
`;
}

export async function generateAiForexArticle({
  keyword,
  locale,
  status,
  trendSource,
  sourceKeywords,
}: {
  keyword: string;
  locale: ArticleLocale;
  status: "DRAFT" | "PUBLISHED";
  trendSource?: string;
  sourceKeywords: string[];
}) {
  const config = resolveAiProvider();
  if (!config) {
    return { ok: false as const, error: "missing_ai_provider" };
  }

  const client = createAiClient(config);
  const completion = await client.chat.completions.create({
    model: config.model,
    temperature: 0.6,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are an SEO editor for an educational forex website. You write cautious, non-advisory, original articles.",
      },
      { role: "user", content: buildArticlePrompt(keyword, locale) },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) return { ok: false as const, error: "empty_ai_response" };

  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    return { ok: false as const, error: "invalid_ai_json" };
  }

  const parsed = articleSchema.safeParse(json);
  if (!parsed.success) return { ok: false as const, error: "invalid_ai_response" };

  const slug = await uniqueSlug(slugify(parsed.data.title), locale);
  const article = await prisma.aiGeneratedArticle.create({
    data: {
      ...parsed.data,
      slug,
      locale,
      keyword,
      status,
      trendSource,
      sourceKeywords,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
    },
  });

  return { ok: true as const, article };
}

export async function runAiArticleAutomation() {
  const setting = await prisma.aiArticleAutomationSetting.upsert({
    where: { id: "default" },
    create: {},
    update: {},
  });

  if (!setting.enabled) return { ok: true, skipped: "disabled" };

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const generatedToday = await prisma.aiGeneratedArticle.count({
    where: { generatedAt: { gte: since } },
  });
  if (generatedToday >= setting.maxArticlesPerDay) {
    return { ok: true, skipped: "daily_limit" };
  }

  const locale = setting.locale === "en" ? "en" : "vi";
  const { keywords, trendSource } = await getTrendingForexKeywords(setting.seedKeywords);
  const recent = await prisma.aiGeneratedArticle.findMany({
    where: {
      generatedAt: {
        gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
    },
    select: { keyword: true },
  });
  const recentKeywords = new Set(recent.map((item) => item.keyword.toLowerCase()));
  const keyword =
    keywords.find((item) => !recentKeywords.has(item.toLowerCase())) ??
    keywords[0] ??
    setting.seedKeywords[0] ??
    "forex risk management";

  const result = await generateAiForexArticle({
    keyword,
    locale,
    status: setting.autoPublish ? "PUBLISHED" : "DRAFT",
    trendSource,
    sourceKeywords: keywords,
  });

  await prisma.aiArticleAutomationSetting.update({
    where: { id: "default" },
    data: { lastRunAt: new Date() },
  });

  return result;
}
