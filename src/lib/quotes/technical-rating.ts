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
  /** Recommend.All khung 1 ngày — chỉ để hiển thị, không còn dùng trong quy tắc tín hiệu. */
  score1d: number;
  /** Recommend.All khung 1 giờ — xác nhận cùng chiều. */
  score1h: number;
  /** Recommend.All khung 15 phút — xác nhận cùng chiều. */
  score15m: number;
  /** Giá đóng cửa gần nhất — tham khảo, không phải giá lúc fire chính xác đến từng tick. */
  close: number;
  /** Average True Range khung 4H — đơn vị đo biến động, dùng để tính vùng entry/SL/TP. */
  atr4h: number;
  /** EMA20 khung 4H — điểm neo pullback cho vùng entry tham khảo. */
  ema20_4h: number;
};

export type ConfidentSignal = "buy" | "sell";

/**
 * "Tín hiệu chắc chắn" = khung 4H đạt Strong Buy/Sell VÀ cả H1 lẫn M15 cùng chiều
 * (chỉ cần cùng dấu, không cần strong). Đổi từ "4H strong + 1D cùng chiều" theo yêu cầu
 * user 2026-10-18 — báo sát nhịp giao dịch trong ngày hơn; 4H strong vẫn là bộ lọc nhiễu.
 */
export function computeConfidentSignal(scores: SymbolScores): ConfidentSignal | null {
  const rating4h = classifyRating(scores.score4h);
  if (rating4h === "strong_buy" && scores.score1h > 0 && scores.score15m > 0) return "buy";
  if (rating4h === "strong_sell" && scores.score1h < 0 && scores.score15m < 0) return "sell";
  return null;
}

/** Số chữ số thập phân hợp lý theo độ lớn giá — JPY/vàng/crypto ít số lẻ hơn major FX. */
function decimalsForPrice(referencePrice: number): number {
  const abs = Math.abs(referencePrice);
  if (abs >= 1000) return 1;
  if (abs >= 100) return 2;
  if (abs >= 10) return 3;
  if (abs >= 1) return 4;
  return 5;
}

function roundPrice(value: number, referencePrice: number): number {
  const decimals = decimalsForPrice(referencePrice);
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export type PriceLevels = {
  /** Vùng giá tham khảo để chờ pullback vào lệnh (không phải giá thị trường phải khớp ngay). */
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  takeProfit: number;
};

/**
 * Vùng giá entry/SL/TP tham khảo — neo quanh EMA20(4H) (điểm pullback hợp lý thay vì đuổi
 * giá tại đỉnh/đáy 4H), đơn vị đo bằng ATR(4H): entry = EMA20 ± 0.5×ATR, SL = 1×ATR ngoài
 * entry, TP = 2×ATR (R:R ~1:2). Đây là công thức kỹ thuật đơn giản mang tính giáo dục,
 * KHÔNG phải khuyến nghị đầu tư / entry chính xác.
 */
export function computePriceLevels(signal: ConfidentSignal, scores: SymbolScores): PriceLevels {
  const half = scores.atr4h * 0.5;
  const entryLow = scores.ema20_4h - half;
  const entryHigh = scores.ema20_4h + half;
  const raw =
    signal === "buy"
      ? {
          entryLow,
          entryHigh,
          stopLoss: scores.ema20_4h - scores.atr4h,
          takeProfit: scores.ema20_4h + scores.atr4h * 2,
        }
      : {
          entryLow,
          entryHigh,
          stopLoss: scores.ema20_4h + scores.atr4h,
          takeProfit: scores.ema20_4h - scores.atr4h * 2,
        };

  return {
    entryLow: roundPrice(raw.entryLow, scores.close),
    entryHigh: roundPrice(raw.entryHigh, scores.close),
    stopLoss: roundPrice(raw.stopLoss, scores.close),
    takeProfit: roundPrice(raw.takeProfit, scores.close),
  };
}

/**
 * Score line shown next to a signal. Signals since 2026-10-18 carry M15/H1/H4
 * (the timeframes the rule uses); older ones only have 4H/1D.
 */
export function formatSignalScores(m: {
  score4h?: number | null;
  score1d?: number | null;
  score1h?: number | null;
  score15m?: number | null;
}): string | null {
  const ok = (v: number | null | undefined): v is number => typeof v === "number";
  if (ok(m.score15m) && ok(m.score1h) && ok(m.score4h)) {
    return `M15 ${m.score15m} · H1 ${m.score1h} · H4 ${m.score4h}`;
  }
  if (ok(m.score4h) && ok(m.score1d)) return `4H ${m.score4h} · 1D ${m.score1d}`;
  return null;
}
