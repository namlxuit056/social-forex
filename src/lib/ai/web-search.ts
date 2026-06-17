export type SearchResult = {
  title: string;
  url: string;
  content: string;
  publishedDate?: string;
};

/**
 * Search for the latest articles using Tavily (AI-optimized search).
 * Requires TAVILY_API_KEY. Returns [] when not configured.
 */
export async function webSearch(query: string, maxResults = 5): Promise<SearchResult[]> {
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
        include_domains: [
          "dailyfx.com",
          "forexlive.com",
          "fxstreet.com",
          "investing.com",
          "reuters.com",
          "bloomberg.com",
          "marketwatch.com",
          "finance.yahoo.com",
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: { title: string; url: string; content: string; published_date?: string }[];
    };

    return (data.results ?? []).map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content?.slice(0, 1200) ?? "",
      publishedDate: r.published_date,
    }));
  } catch {
    return [];
  }
}

/**
 * Build a search query for a forex keyword.
 * e.g. "EUR/USD" → "EURUSD forex analysis forecast June 2025"
 */
export function buildForexSearchQuery(keyword: string): string {
  const today = new Date();
  const month = today.toLocaleString("en-US", { month: "long" });
  const year = today.getFullYear();

  // Normalize ticker notation
  const normalized = keyword.replace(/[\/\s]/g, "").toUpperCase();

  return `${normalized} forex analysis forecast ${month} ${year}`;
}
