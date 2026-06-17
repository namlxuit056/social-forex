import { z } from "zod";
import { createAiClient, resolveAiProvider } from "@/lib/ai/provider";
import { fetchArticleImage } from "@/lib/ai/article-images";
import { prisma } from "@/lib/prisma";

type ArticleLocale = "vi" | "en";

const articleSchema = z.object({
  title: z.string().min(8).max(140),
  summary: z.string().min(30).max(280),
  metaDescription: z.string().min(50).max(180),
  body: z.string().min(900).max(9000),
});

const googleTrendsSchema = z.object({
  default: z.object({
    trendingSearchesDays: z.array(
      z.object({
        trendingSearches: z.array(
          z.object({ title: z.object({ query: z.string() }) }),
        ),
      }),
    ),
  }),
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

type NewsItem = { title: string; description: string; link: string };

async function fetchGoogleNewsItems(seedKeywords: string[]): Promise<{ items: NewsItem[]; source: string }> {
  const query = encodeURIComponent(
    `(${seedKeywords.slice(0, 8).join(" OR ")}) when:7d`,
  );
  const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "SocialForexBot/1.0" },
      next: { revalidate: 60 * 60 },
    });
    if (!res.ok) return { items: [], source: url };

    const xml = await res.text();
    // Extract <item> blocks
    const itemBlocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
    const items: NewsItem[] = itemBlocks
      .map((block) => {
        const titleMatch = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
        const descMatch = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/);
        const linkMatch = block.match(/<link>(.*?)<\/link>/);
        const title = stripTags(titleMatch?.[1] ?? titleMatch?.[2] ?? "").trim();
        const description = stripTags(descMatch?.[1] ?? descMatch?.[2] ?? "").slice(0, 300).trim();
        const link = (linkMatch?.[1] ?? "").trim();
        return { title, description, link };
      })
      .filter((item) => item.title && !item.title.includes("Google News"))
      .slice(0, 10);

    return { items, source: url };
  } catch {
    return { items: [], source: url };
  }
}

// Only pass trending terms that are relevant to forex/finance.
// Google Trends VN returns viral/entertainment topics that corrupt the keyword pool.
const FOREX_RELEVANCE_PATTERNS = [
  /\b(forex|xau|gold|vàng|usd|eur|gbp|jpy|aud|cad|chf|nzd|btc|crypto)\b/i,
  /\b(lãi suất|lạm phát|fed|interest rate|inflation|gdp|oil|crude|dầu)\b/i,
  /\b(chứng khoán|cổ phiếu|nasdaq|s&p|dow|stock|invest|đầu tư)\b/i,
  /\b(ngân hàng|central bank|monetary|tài chính|finance|economy|kinh tế)\b/i,
  /\b(trade|trading|giao dịch|market|thị trường|breakout|bullish|bearish)\b/i,
];

function isForexRelevant(term: string): boolean {
  return FOREX_RELEVANCE_PATTERNS.some((p) => p.test(term));
}

async function fetchGoogleTrendingSearches(locale: ArticleLocale) {
  const hl = locale === "vi" ? "vi" : "en-US";
  const geo = locale === "vi" ? "VN" : "US";
  const url = `https://trends.google.com/trends/api/dailytrends?hl=${hl}&geo=${geo}&ns=15`;
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "SocialForexBot/1.0", accept: "application/json" },
      next: { revalidate: 60 * 60 * 3 },
    });
    if (!res.ok) return [];
    const raw = await res.text();
    // Google prefixes response with )]}' to prevent JSON hijacking
    const json = JSON.parse(raw.slice(raw.indexOf("{")));
    const parsed = googleTrendsSchema.safeParse(json);
    if (!parsed.success) return [];
    return parsed.data.default.trendingSearchesDays
      .flatMap((day) => day.trendingSearches)
      .map((s) => s.title.query)
      .filter(isForexRelevant)
      .slice(0, 20);
  } catch {
    return [];
  }
}

export async function getTrendingForexKeywords(
  seedKeywords: string[],
  locale: ArticleLocale = "vi",
) {
  const [{ items: newsItems, source }, googleTrends] = await Promise.all([
    fetchGoogleNewsItems(seedKeywords),
    fetchGoogleTrendingSearches(locale),
  ]);

  const counts = new Map<string, number>();

  for (const seed of seedKeywords) {
    counts.set(seed, (counts.get(seed) ?? 0) + 2);
  }
  for (const trend of googleTrends) {
    const normalized = trend.trim();
    if (normalized.length >= 2 && normalized.length <= 48) {
      counts.set(normalized, (counts.get(normalized) ?? 0) + 3);
    }
    for (const word of extractTitleWords(normalized)) {
      const key = word.toUpperCase() === word ? word : word.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 2);
    }
  }
  for (const item of newsItems) {
    for (const word of extractTitleWords(item.title)) {
      const normalized = word.toUpperCase() === word ? word : word.toLowerCase();
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }

  const keywords = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([keyword]) => keyword)
    .filter((keyword) => keyword.length <= 48)
    .slice(0, 15);

  return { keywords, trendSource: source, googleTrends: googleTrends.slice(0, 10), newsItems };
}

export async function fetchCurrentTrendingKeywords(
  seedKeywords: string[],
  locale: ArticleLocale = "vi",
) {
  return getTrendingForexKeywords(seedKeywords, locale);
}

async function uniqueSlug(base: string, locale: ArticleLocale) {
  const slug = base || `forex-article-${Date.now()}`;
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

function buildArticlePrompt(keyword: string, locale: ArticleLocale, newsItems: NewsItem[]) {
  const language =
    locale === "vi"
      ? "Vietnamese, natural for beginner and intermediate forex traders in Vietnam"
      : "English, natural for beginner and intermediate forex traders";

  const today = new Date().toISOString().slice(0, 10);

  const hasNews = newsItems.length > 0;
  const newsBlock = hasNews
    ? `## Recent news to synthesize (published within the last 7 days — do NOT copy sentences verbatim, but MUST reference specific events/facts from this list in the article body):
${newsItems
  .slice(0, 6)
  .map((item, i) => `${i + 1}. ${item.title}${item.description ? ` — ${item.description}` : ""}`)
  .join("\n")}`
    : `## No live news available — write based on typical recurring patterns and current macro context as of ${today}. Still be specific: mention plausible current drivers (Fed rate expectations, USD strength/weakness, geopolitical tensions) rather than generic bullet points.`;

  return `Write an educational SEO article for Social Forex. Today's date: ${today}.

Keyword: ${keyword}
Language: ${language}

${newsBlock}

## Output format
Return valid JSON only with these keys: title, summary, metaDescription, body.

## Content requirements
- title: concise, keyword-rich, under 70 characters. Do NOT start with generic phrases like "Tìm hiểu về" or "Introduction to".
- summary: 1-2 sentences summarizing what's happening RIGHT NOW and why traders care today. Must be specific, not generic.
- metaDescription: 150-160 characters, action-oriented, includes the keyword.
- body: markdown with H2 (##) sections. Minimum 5 sections covering:
  1. What's happening in the market RIGHT NOW (specific, time-anchored — reference news items if available)
  2. Why this matters for traders (concrete impact on price action or sentiment)
  3. Practical checklist (what to watch, what indicators/levels to track)
  4. Common mistakes traders make with this topic
  5. Risk management (stop-loss sizing, position sizing, capital rules)
  6. Risk disclaimer (final section — educational only, not financial advice)

## Hard rules
- NEVER write generic intros like "XAU là mã tiền tệ quốc tế cho vàng" without immediately connecting to current context.
- NEVER use empty filler bullet points. Every bullet must contain a specific fact, level, or action.
- Do NOT give direct buy/sell recommendations or promise profit.
- Mention that readers should verify data on their broker platform, economic calendar, and chart.
- Keep tone practical and direct. No clickbait. No vague platitudes.
`;
}

export async function generateAiForexArticle({
  keyword,
  locale,
  status,
  trendSource,
  sourceKeywords,
  newsItems = [],
}: {
  keyword: string;
  locale: ArticleLocale;
  status: "DRAFT" | "PUBLISHED";
  trendSource?: string;
  sourceKeywords: string[];
  newsItems?: NewsItem[];
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
      { role: "user", content: buildArticlePrompt(keyword, locale, newsItems) },
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

  const [slug, image] = await Promise.all([
    uniqueSlug(slugify(parsed.data.title), locale),
    fetchArticleImage(keyword),
  ]);

  const article = await prisma.aiGeneratedArticle.create({
    data: {
      ...parsed.data,
      slug,
      locale,
      keyword,
      status,
      trendSource,
      sourceKeywords,
      imageUrl: image?.url ?? null,
      imageAlt: image?.alt ?? null,
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

  // Daily limit = number of keyword topics (bilingual = 2 articles per topic)
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const topicsToday = await prisma.aiGeneratedArticle.count({
    where: { generatedAt: { gte: since }, locale: "vi" },
  });
  if (topicsToday >= setting.maxArticlesPerDay) {
    return { ok: true, skipped: "daily_limit" };
  }

  // Always use vi as primary locale for trending keyword lookup
  const { keywords, trendSource, newsItems } = await getTrendingForexKeywords(setting.seedKeywords, "vi");
  const recent = await prisma.aiGeneratedArticle.findMany({
    where: {
      generatedAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
      locale: "vi",
    },
    select: { keyword: true },
  });
  const recentKeywords = new Set(recent.map((item) => item.keyword.toLowerCase()));
  const keyword =
    keywords.find((item) => !recentKeywords.has(item.toLowerCase())) ??
    keywords[0] ??
    setting.seedKeywords[0] ??
    "forex risk management";

  const articleStatus = setting.autoPublish ? "PUBLISHED" : "DRAFT";

  // Generate both VI and EN in parallel with real news context
  const [viResult, enResult] = await Promise.all([
    generateAiForexArticle({ keyword, locale: "vi", status: articleStatus, trendSource, sourceKeywords: keywords, newsItems }),
    generateAiForexArticle({ keyword, locale: "en", status: articleStatus, trendSource, sourceKeywords: keywords, newsItems }),
  ]);

  await prisma.aiArticleAutomationSetting.update({
    where: { id: "default" },
    data: { lastRunAt: new Date() },
  });

  return { ok: true as const, vi: viResult, en: enResult };
}

export async function generateArticleForCustomKeyword({
  keyword,
  locale,
  status,
  bilingual = true,
}: {
  keyword: string;
  locale: ArticleLocale;
  status: "DRAFT" | "PUBLISHED";
  bilingual?: boolean;
}) {
  const { keywords, trendSource, newsItems } = await getTrendingForexKeywords([keyword], locale);
  if (!bilingual) {
    return generateAiForexArticle({ keyword, locale, status, trendSource, sourceKeywords: keywords, newsItems });
  }
  const otherLocale: ArticleLocale = locale === "vi" ? "en" : "vi";
  const [primary, other] = await Promise.all([
    generateAiForexArticle({ keyword, locale, status, trendSource, sourceKeywords: keywords, newsItems }),
    generateAiForexArticle({ keyword, locale: otherLocale, status, trendSource, sourceKeywords: keywords, newsItems }),
  ]);
  return { ok: true as const, primary, other };
}
