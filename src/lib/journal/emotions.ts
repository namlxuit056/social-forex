/** Trạng thái cảm xúc khi vào lệnh — lưu string, validate server-side. */
export const TRADE_EMOTIONS = [
  "CALM",
  "CONFIDENT",
  "FOMO",
  "REVENGE",
  "HESITANT",
] as const;

export type TradeEmotion = (typeof TRADE_EMOTIONS)[number];

export function parseTradeEmotion(value: unknown): TradeEmotion | null {
  return typeof value === "string" &&
    (TRADE_EMOTIONS as readonly string[]).includes(value)
    ? (value as TradeEmotion)
    : null;
}

/** URL ảnh chart hợp lệ: https, độ dài hợp lý. Trả null nếu không hợp lệ. */
export function parseJournalImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (v.length === 0 || v.length > 500) return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" ? v : null;
  } catch {
    return null;
  }
}
