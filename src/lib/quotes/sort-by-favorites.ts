import type { QuoteRow } from "@/lib/quotes/types";

/** Đưa cặp trong watchlist lên trước; trong watchlist giữ thứ tự đã lưu; còn lại sort theo symbol. */
export function sortQuoteRowsByFavorites(
  rows: QuoteRow[],
  favorites: string[],
): QuoteRow[] {
  const favSet = new Set(favorites);
  return [...rows].sort((a, b) => {
    const aF = favSet.has(a.symbol) ? 0 : 1;
    const bF = favSet.has(b.symbol) ? 0 : 1;
    if (aF !== bF) return aF - bF;
    if (aF === 0) {
      return favorites.indexOf(a.symbol) - favorites.indexOf(b.symbol);
    }
    return a.symbol.localeCompare(b.symbol);
  });
}
