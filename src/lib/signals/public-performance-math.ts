/** Tối thiểu số lệnh đóng (win+loss) để hiển thị win rate — theo spec PM. */
export const TRADER_STATS_MIN_SAMPLE = 5;

export function winRatePercent(wins: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((wins / total) * 1000) / 10;
}

export function calcRR(
  direction: string,
  entry: number,
  stopLoss: number,
  takeProfit: number,
): number | null {
  const isBuy =
    direction.toUpperCase().includes("BUY") ||
    direction.toUpperCase() === "LONG";
  const risk = isBuy ? entry - stopLoss : stopLoss - entry;
  const reward = isBuy ? takeProfit - entry : entry - takeProfit;
  if (risk <= 0 || reward <= 0) return null;
  return reward / risk;
}
