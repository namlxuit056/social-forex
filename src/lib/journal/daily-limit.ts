/** Ngày UTC (00:00–24:00) chứa `date` — cùng convention với DailyTradingPlan.planDate. */
export function utcDayRange(date: Date): { start: Date; end: Date } {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/** true khi đã log đủ/vượt số lệnh tối đa tự đặt cho ngày đó. null/0 = không giới hạn. */
export function isOverDailyTradeLimit(
  tradesLoggedToday: number,
  maxTrades: number | null | undefined,
): boolean {
  if (!maxTrades) return false;
  return tradesLoggedToday >= maxTrades;
}
