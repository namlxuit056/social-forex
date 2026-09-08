/**
 * Logic thuần phân loại tín hiệu từ các nguồn ngoài TradingView. Không I/O, có test
 * (external-signal-classify.test.ts).
 */

/** Đám đông long ≥ mức này → tín hiệu BÁN (ngược chiều); long ≤ 100-mức → tín hiệu MUA. */
export const CROWD_EXTREME_PCT = 65;

/**
 * Sentiment khách lẻ (OANDA / Myfxbook / IG). Chỉ phát tín hiệu khi lệch đủ mạnh —
 * đám đông thường sai ở vùng cực đoan nên đi ngược lại.
 */
export function classifyCrowd(longPct: number): "buy" | "sell" | null {
  if (!Number.isFinite(longPct)) return null;
  if (longPct >= CROWD_EXTREME_PCT) return "sell";
  if (longPct <= 100 - CROWD_EXTREME_PCT) return "buy";
  return null;
}

/** Vị thế ròng quỹ lớn tính theo % open interest — ngưỡng "đáng chú ý". */
export const COT_NET_PCT_THRESHOLD = 8;
/** Vị thế ròng rất lớn — phát tín hiệu kể cả khi tuần này không tăng thêm. */
export const COT_NET_PCT_STRONG = 20;

/**
 * CFTC COT: đi theo chiều quỹ lớn (non-commercial) khi vị thế ròng lớn VÀ (được mở rộng
 * thêm trong tuần HOẶC đã ở mức rất lớn).
 */
export function classifyCot(netPct: number, weekChange: number): "buy" | "sell" | null {
  if (!Number.isFinite(netPct)) return null;
  const abs = Math.abs(netPct);
  const strong = abs >= COT_NET_PCT_STRONG;
  const extended = abs >= COT_NET_PCT_THRESHOLD && Math.sign(weekChange) === Math.sign(netPct);
  if (!strong && !extended) return null;
  return netPct > 0 ? "buy" : "sell";
}

/**
 * Ghép bias của hai đồng tiền thành tín hiệu cho cặp chéo (VD EURGBP): chỉ phát khi hai
 * đồng phân kỳ rõ (một mạnh, một yếu). `baseBias`/`quoteBias` = "buy" nghĩa là đồng đó mạnh.
 */
export function crossSignal(
  baseBias: "buy" | "sell" | null,
  quoteBias: "buy" | "sell" | null,
): "buy" | "sell" | null {
  if (!baseBias || !quoteBias) return null;
  if (baseBias === "buy" && quoteBias === "sell") return "buy";
  if (baseBias === "sell" && quoteBias === "buy") return "sell";
  return null;
}
