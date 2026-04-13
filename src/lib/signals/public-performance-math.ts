/** Tối thiểu số lệnh đóng (win+loss) để hiển thị win rate — theo spec PM. */
export const TRADER_STATS_MIN_SAMPLE = 5;

export function winRatePercent(wins: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((wins / total) * 1000) / 10;
}
