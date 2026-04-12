import { QUOTE_BY_SYMBOL } from "@/lib/quotes/definitions";

/** Cặp không đủ 6 ký tự nhưng cần map tiền tệ lịch kinh tế. */
const EXTRA_SYMBOL_TO_CURRENCIES: Record<string, string[]> = {
  USOIL: ["USD"],
};

function normalizeSymbol(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z]/g, "");
}

/**
 * Trả về mã tiền tệ ISO (3 ký tự) liên quan tới cặp, để lọc EconomicCalendarEvent.
 * Chỉ tin cậy cho symbol có trong bảng quote của app hoặc map bổ sung; không đoán cặp lạ.
 */
export function symbolToCurrencies(symbol: string): string[] {
  const s = normalizeSymbol(symbol);
  if (!s) return [];

  const extra = EXTRA_SYMBOL_TO_CURRENCIES[s];
  if (extra) return extra;

  if (!QUOTE_BY_SYMBOL[s]) return [];

  if (s.length === 6 && /^[A-Z]{6}$/.test(s)) {
    return [s.slice(0, 3), s.slice(3, 6)];
  }

  return [];
}
