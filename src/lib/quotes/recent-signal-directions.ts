/** Dòng notification thô (kind TECHNICAL_RATING_SIGNAL) đã gộp theo dedupeKey. */
export type RawSignalNotif = {
  dedupeKey: string;
  createdAt: Date;
  meta: unknown;
};

export type TvSignalRow = {
  symbol: string;
  signal: "buy" | "sell";
  score4h: number | null;
  score1d: number | null;
  entryLow: number | null;
  entryHigh: number | null;
  /** Giá vào "tốt" — mép thuận lợi của vùng vào: mua ở đáy vùng, bán ở đỉnh vùng. */
  bestEntry: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  at: Date;
};

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function parseTvMeta(meta: unknown): Omit<TvSignalRow, "at"> | null {
  if (!meta || typeof meta !== "object") return null;
  const m = meta as Record<string, unknown>;
  // Chỉ lấy tín hiệu điểm kỹ thuật tổng hợp của TradingView.
  if (m.source !== "tradingview") return null;
  const symbol = typeof m.symbol === "string" ? m.symbol : null;
  const signal = m.signal === "buy" || m.signal === "sell" ? m.signal : null;
  if (!symbol || !signal) return null;
  const entryLow = num(m.entryLow);
  const entryHigh = num(m.entryHigh);
  return {
    symbol,
    signal,
    score4h: num(m.score4h),
    score1d: num(m.score1d),
    entryLow,
    entryHigh,
    bestEntry: signal === "buy" ? entryLow : entryHigh,
    stopLoss: num(m.stopLoss),
    takeProfit: num(m.takeProfit),
  };
}

/**
 * Gộp các notification tín hiệu (đã sắp mới nhất trước, một dòng / dedupeKey) thành
 * bảng hướng vào lệnh theo cặp — chỉ nguồn TradingView, giữ tín hiệu mới nhất mỗi cặp,
 * sắp theo thời gian phát gần nhất.
 */
export function latestTvSignals(rows: RawSignalNotif[]): TvSignalRow[] {
  const bySymbol = new Map<string, TvSignalRow>();

  for (const row of rows) {
    const parsed = parseTvMeta(row.meta);
    if (!parsed) continue;
    // rows mới nhất trước → lần đầu gặp mỗi symbol là tín hiệu mới nhất.
    if (bySymbol.has(parsed.symbol)) continue;
    bySymbol.set(parsed.symbol, { ...parsed, at: row.createdAt });
  }

  return [...bySymbol.values()].sort((a, b) => b.at.getTime() - a.at.getTime());
}

/**
 * "holding"   = điểm kỹ thuật 4H hiện tại vẫn cùng chiều tín hiệu đã phát.
 * "reversing" = điểm 4H đã lật ngược chiều → tín hiệu không còn được ủng hộ.
 * "unclear"   = điểm 4H nằm trong vùng trung tính (|score| < 0.1) hoặc thiếu dữ liệu.
 */
export type SignalValidity = "holding" | "reversing" | "unclear";

const NEUTRAL_BAND = 0.1;

export function signalValidity(
  signal: "buy" | "sell",
  currentScore4h: number | null | undefined,
): SignalValidity {
  if (currentScore4h == null || Math.abs(currentScore4h) < NEUTRAL_BAND) {
    return "unclear";
  }
  const currentDir = currentScore4h > 0 ? "buy" : "sell";
  return currentDir === signal ? "holding" : "reversing";
}
