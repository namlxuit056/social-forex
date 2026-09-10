import { fetchTechnicalRatings } from "@/lib/quotes/fetch-tv-ratings";
import type { SymbolScores } from "@/lib/quotes/technical-rating";

// Cache in-memory ở scope module (giống resolve-quotes / ai suggest) — trang chủ render
// nhiều lần không gọi lại scanner TradingView mỗi request. Lỗi fetch trả về map rỗng.
const TTL_MS = 5 * 60 * 1000;
let cache: { at: number; ratings: Map<string, SymbolScores> } | null = null;
let inflight: Promise<Map<string, SymbolScores>> | null = null;

export async function getCachedTechnicalRatings(): Promise<Map<string, SymbolScores>> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.ratings;
  if (inflight) return inflight;

  inflight = fetchTechnicalRatings()
    .then((ratings) => {
      cache = { at: Date.now(), ratings };
      return ratings;
    })
    .catch(() => cache?.ratings ?? new Map<string, SymbolScores>())
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
