type ArticleImage = { url: string; alt: string; credit: string };

// Maps common forex/finance keywords (including Vietnamese fragments) to English image search terms.
// Unsplash/Pexels don't index non-English text, so we always search in English.
const KEYWORD_IMAGE_MAP: [RegExp, string][] = [
  [/xauusd|gold|vàng/i, "gold trading finance"],
  [/eurusd|euro/i, "euro currency trading"],
  [/gbpusd|pound|sterling/i, "pound currency trading"],
  [/usdjpy|yen|japan/i, "japanese yen trading"],
  [/bitcoin|btc|crypto/i, "cryptocurrency trading"],
  [/oil|crude|dầu/i, "oil market trading"],
  [/nasdaq|s&p|stock|cổ phiếu/i, "stock market trading"],
  [/interest rate|lãi suất|fed|central bank|ngân hàng/i, "central bank interest rate"],
  [/inflation|lạm phát/i, "inflation economy chart"],
  [/risk|rủi ro/i, "financial risk management"],
  [/forex|ngoại hối|currency/i, "forex trading currency"],
];

function toImageSearchTerm(keyword: string): string {
  for (const [pattern, term] of KEYWORD_IMAGE_MAP) {
    if (pattern.test(keyword)) return term;
  }
  // Extract ASCII words (strips Vietnamese characters) as last resort
  const ascii = keyword.replace(/[^\x00-\x7F]+/g, " ").trim();
  return ascii.length >= 3 ? `${ascii} finance trading` : "forex trading finance";
}

async function fetchUnsplash(keyword: string): Promise<ArticleImage | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  try {
    const q = encodeURIComponent(toImageSearchTerm(keyword));
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${q}&client_id=${key}&per_page=3&orientation=landscape`,
      { next: { revalidate: 60 * 60 * 24 } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results: { urls: { regular: string }; alt_description: string | null; user: { name: string } }[];
    };
    // Pick randomly among top 3 results to avoid identical images across articles
    const results = data.results.filter(Boolean);
    if (results.length === 0) return null;
    const photo = results[Math.floor(Math.random() * results.length)];
    return {
      url: `${photo.urls.regular}&w=1200&q=80`,
      alt: photo.alt_description ?? keyword,
      credit: `Photo by ${photo.user.name} on Unsplash`,
    };
  } catch {
    return null;
  }
}

async function fetchPexels(keyword: string): Promise<ArticleImage | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  try {
    const q = encodeURIComponent(toImageSearchTerm(keyword));
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${q}&per_page=3&orientation=landscape`,
      {
        headers: { Authorization: key },
        next: { revalidate: 60 * 60 * 24 },
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      photos: { src: { large2x: string; large: string }; alt: string; photographer: string }[];
    };
    const photos = data.photos.filter(Boolean);
    if (photos.length === 0) return null;
    const photo = photos[Math.floor(Math.random() * photos.length)];
    return {
      url: photo.src.large2x ?? photo.src.large,
      alt: photo.alt ?? keyword,
      credit: `Photo by ${photo.photographer} on Pexels`,
    };
  } catch {
    return null;
  }
}

/** Try Unsplash → Pexels → null. Returns null when no API key is configured. */
export async function fetchArticleImage(keyword: string): Promise<ArticleImage | null> {
  return (await fetchUnsplash(keyword)) ?? (await fetchPexels(keyword));
}
