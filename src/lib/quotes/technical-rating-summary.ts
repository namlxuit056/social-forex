export type SignalEvent = { symbol: string; signal: "buy" | "sell" };

export type DailySummary = {
  totalSignals: number;
  buySignals: number;
  sellSignals: number;
  /** Số tín hiệu vẫn cùng chiều tại thời điểm tính (dựa trên score4h hiện tại > 0 hoặc < 0)
   * — proxy đơn giản cho "chưa bị đảo chiều", KHÔNG phải đánh giá lời/lỗ thực tế (app chưa
   * theo dõi giá tại thời điểm fire để tính P/L thật). */
  heldSignals: number;
  topSymbols: { symbol: string; count: number }[];
};

/**
 * Tổng kết các tín hiệu "chắc chắn" đã fire trong 1 ngày. `events` phải đã dedupe theo
 * dedupeKey ở tầng gọi (Notification bị nhân bản theo số user vì broadcast cho tất cả).
 */
export function computeDailySummary(
  events: SignalEvent[],
  currentScore4hBySymbol: Map<string, number>,
): DailySummary {
  const bySymbol = new Map<string, number>();
  let buySignals = 0;
  let sellSignals = 0;
  let heldSignals = 0;

  for (const ev of events) {
    bySymbol.set(ev.symbol, (bySymbol.get(ev.symbol) ?? 0) + 1);
    if (ev.signal === "buy") buySignals += 1;
    else sellSignals += 1;

    const current = currentScore4hBySymbol.get(ev.symbol);
    if (current !== undefined) {
      if (ev.signal === "buy" && current > 0) heldSignals += 1;
      else if (ev.signal === "sell" && current < 0) heldSignals += 1;
    }
  }

  const topSymbols = [...bySymbol.entries()]
    .map(([symbol, count]) => ({ symbol, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalSignals: events.length,
    buySignals,
    sellSignals,
    heldSignals,
    topSymbols,
  };
}

export type DailySummaryRow = DailySummary & { day: string };

/**
 * Cộng dồn nhiều dòng tổng kết ngày thành 1 tổng kết cho cả khoảng (tuần/tháng).
 * Lưu ý: topSymbols chỉ cộng dồn từ top-5 mỗi ngày (không lưu full breakdown mỗi ngày) —
 * là ước lượng hợp lý cho "symbol nổi bật trong tuần/tháng", không phải con số tuyệt đối chính xác
 * nếu 1 symbol có ít lần fire rải rác nhưng chưa từng lọt top-5 ngày nào.
 */
export function rollupSummaries(rows: DailySummaryRow[]): DailySummary {
  let totalSignals = 0;
  let buySignals = 0;
  let sellSignals = 0;
  let heldSignals = 0;
  const bySymbol = new Map<string, number>();

  for (const row of rows) {
    totalSignals += row.totalSignals;
    buySignals += row.buySignals;
    sellSignals += row.sellSignals;
    heldSignals += row.heldSignals;
    for (const { symbol, count } of row.topSymbols) {
      bySymbol.set(symbol, (bySymbol.get(symbol) ?? 0) + count);
    }
  }

  const topSymbols = [...bySymbol.entries()]
    .map(([symbol, count]) => ({ symbol, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { totalSignals, buySignals, sellSignals, heldSignals, topSymbols };
}
