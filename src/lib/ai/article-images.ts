type ArticleImage = { url: string; alt: string; credit: string };

async function fetchUnsplash(keyword: string): Promise<ArticleImage | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  try {
    const q = encodeURIComponent(`${keyword} finance trading`);
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${q}&client_id=${key}&per_page=1&orientation=landscape`,
      { next: { revalidate: 60 * 60 * 24 } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results: { urls: { regular: string }; alt_description: string | null; user: { name: string } }[];
    };
    const photo = data.results[0];
    if (!photo) return null;
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
    const q = encodeURIComponent(`${keyword} finance`);
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${q}&per_page=1&orientation=landscape`,
      {
        headers: { Authorization: key },
        next: { revalidate: 60 * 60 * 24 },
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      photos: { src: { large2x: string; large: string }; alt: string; photographer: string }[];
    };
    const photo = data.photos[0];
    if (!photo) return null;
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
