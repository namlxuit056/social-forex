export type TvMarket = "forex" | "cfd" | "futures" | "crypto";

export type TvTickerInfo = { market: TvMarket; ticker: string };

/** Map ký hiệu app (QUOTE_DEFINITIONS) sang market + ticker của TradingView scanner.
 * Endpoint scanner.tradingview.com/{market}/scan tách riêng theo market — không gộp
 * chung được nên phải nhóm request theo market khi gọi hàng loạt. */
export const TV_TICKER_MAP: Record<string, TvTickerInfo> = {
  EURUSD: { market: "forex", ticker: "FX_IDC:EURUSD" },
  GBPUSD: { market: "forex", ticker: "FX_IDC:GBPUSD" },
  USDJPY: { market: "forex", ticker: "FX_IDC:USDJPY" },
  AUDUSD: { market: "forex", ticker: "FX_IDC:AUDUSD" },
  USDCAD: { market: "forex", ticker: "FX_IDC:USDCAD" },
  NZDUSD: { market: "forex", ticker: "FX_IDC:NZDUSD" },
  USDCHF: { market: "forex", ticker: "FX_IDC:USDCHF" },
  EURGBP: { market: "forex", ticker: "FX_IDC:EURGBP" },
  EURJPY: { market: "forex", ticker: "FX_IDC:EURJPY" },
  GBPJPY: { market: "forex", ticker: "FX_IDC:GBPJPY" },
  XAUUSD: { market: "cfd", ticker: "TVC:GOLD" },
  XAGUSD: { market: "cfd", ticker: "TVC:SILVER" },
  USOIL: { market: "futures", ticker: "NYMEX:CL1!" },
  BTCUSD: { market: "crypto", ticker: "BINANCE:BTCUSDT" },
  ETHUSD: { market: "crypto", ticker: "BINANCE:ETHUSDT" },
};

export type Rating = "strong_buy" | "buy" | "neutral" | "sell" | "strong_sell";

/** Ngưỡng chuẩn của TradingView cho điểm Recommend.All (-1..1). */
export function classifyRating(score: number): Rating {
  if (score >= 0.5) return "strong_buy";
  if (score >= 0.1) return "buy";
  if (score > -0.1) return "neutral";
  if (score > -0.5) return "sell";
  return "strong_sell";
}

export type SymbolScores = {
  /** Recommend.All khung 4 giờ — dùng làm tín hiệu chính. */
  score4h: number;
  /** Recommend.All khung 1 ngày — dùng để xác nhận cùng chiều, tăng độ tin cậy. */
  score1d: number;
};

export type ConfidentSignal = "buy" | "sell";

/**
 * "Tín hiệu chắc chắn" = khung 4H đạt Strong Buy/Sell VÀ khung 1D đồng thuận chiều
 * (không nhất thiết strong, chỉ cần cùng dấu) — để lọc bớt tín hiệu 4H bị nhiễu ngắn hạn
 * ngược xu hướng lớn hơn.
 */
export function computeConfidentSignal(scores: SymbolScores): ConfidentSignal | null {
  const rating4h = classifyRating(scores.score4h);
  if (rating4h === "strong_buy" && scores.score1d > 0) return "buy";
  if (rating4h === "strong_sell" && scores.score1d < 0) return "sell";
  return null;
}
