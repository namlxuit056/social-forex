/** Danh sách lỗi quy trình chuẩn cho journal — lưu string[], không enum DB. */
export const TRADE_MISTAKES = [
  "NO_STOP",
  "MOVED_STOP",
  "EARLY_ENTRY",
  "CHASED",
  "OVERSIZED",
  "NO_PLAN",
  "CUT_WINNER_EARLY",
  "HELD_LOSER",
  "AGAINST_TREND",
  "REVENGE",
  "NEWS",
  "OVERTRADING",
] as const;

export type MistakeTag = (typeof TRADE_MISTAKES)[number];

const KNOWN = new Set<string>(TRADE_MISTAKES);

/**
 * Chuẩn hoá input thành mảng MistakeTag hợp lệ: nhận mảng hoặc chuỗi phân tách
 * bằng dấu phẩy, lọc tag không hợp lệ, khử trùng lặp, giữ thứ tự catalog, cap 12.
 */
export function parseMistakes(value: unknown): MistakeTag[] {
  let raw: unknown[];
  if (Array.isArray(value)) raw = value;
  else if (typeof value === "string") raw = value.split(",");
  else return [];

  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const tag = item.trim();
    if (KNOWN.has(tag)) seen.add(tag);
  }
  // Giữ thứ tự catalog cho ổn định
  return TRADE_MISTAKES.filter((tag) => seen.has(tag));
}
