/** Danh sách setup chuẩn cho journal — lưu dạng string để dễ mở rộng, không cần enum DB. */
export const TRADE_SETUPS = [
  "BREAKOUT",
  "PULLBACK",
  "TREND",
  "REVERSAL",
  "RANGE",
  "NEWS",
  "SCALP",
  "OTHER",
] as const;

export type TradeSetup = (typeof TRADE_SETUPS)[number];

export function parseTradeSetup(value: unknown): TradeSetup | null {
  return typeof value === "string" &&
    (TRADE_SETUPS as readonly string[]).includes(value)
    ? (value as TradeSetup)
    : null;
}

/** Setup có winRate cao nhất của trader (>= 5 lệnh W/L) — dùng cho playbook match trong journal-form. */
export type BestSetupInfo = {
  setup: TradeSetup;
  winRate: number;
  total: number;
};
