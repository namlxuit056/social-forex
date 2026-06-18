export type SearchResult = {
  title: string;
  url: string;
  content: string;
  publishedDate?: string;
};

const FOREX_DOMAINS = [
  "dailyfx.com",
  "forexlive.com",
  "fxstreet.com",
  "investing.com",
  "reuters.com",
  "bloomberg.com",
  "marketwatch.com",
  "finance.yahoo.com",
  "babypips.com",
  "tradingeconomics.com",
  "ig.com",
  "oanda.com",
  "financialtimes.com",
];

/**
 * Search for the latest articles using Tavily (AI-optimized search).
 * Requires TAVILY_API_KEY. Returns [] when not configured.
 */
export async function webSearch(query: string, maxResults = 8): Promise<SearchResult[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query,
        search_depth: "advanced",
        include_answer: false,
        include_images: false,
        max_results: maxResults,
        include_domains: FOREX_DOMAINS,
      }),
      signal: AbortSignal.timeout(18_000),
    });

    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: { title: string; url: string; content: string; published_date?: string }[];
    };

    return (data.results ?? []).map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content?.slice(0, 2000) ?? "",
      publishedDate: r.published_date,
    }));
  } catch {
    return [];
  }
}

/**
 * Run two Tavily queries in parallel: general analysis + technical deep-dive.
 * Deduplicates by URL. Returns up to maxResults combined results.
 */
export async function webSearchDeep(
  primaryQuery: string,
  technicalQuery: string,
  maxResults = 6,
): Promise<SearchResult[]> {
  const [primary, technical] = await Promise.all([
    webSearch(primaryQuery, maxResults),
    webSearch(technicalQuery, maxResults),
  ]);

  const seen = new Set<string>();
  const combined: SearchResult[] = [];
  for (const result of [...primary, ...technical]) {
    if (!seen.has(result.url)) {
      seen.add(result.url);
      combined.push(result);
    }
  }
  return combined.slice(0, maxResults * 2);
}

/**
 * Build a search query for a forex keyword.
 * e.g. "EUR/USD" → "EURUSD forex analysis forecast June 2025"
 */
export function buildForexSearchQuery(keyword: string): string {
  const today = new Date();
  const month = today.toLocaleString("en-US", { month: "long" });
  const year = today.getFullYear();

  const normalized = keyword.replace(/[\/\s]/g, "").toUpperCase();
  return `${normalized} forex analysis forecast ${month} ${year}`;
}

/**
 * Build a technical-focused search query for deeper chart/indicator content.
 * e.g. "EUR/USD" → "EURUSD technical analysis support resistance RSI EMA June 2025"
 */
export function buildForexTechnicalQuery(keyword: string): string {
  const today = new Date();
  const month = today.toLocaleString("en-US", { month: "long" });
  const year = today.getFullYear();

  const normalized = keyword.replace(/[\/\s]/g, "").toUpperCase();
  return `${normalized} technical analysis support resistance RSI EMA fibonacci ${month} ${year}`;
}
