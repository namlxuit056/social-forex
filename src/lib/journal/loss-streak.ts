export type ClosedTradeLite = {
  result: string;
  closedAt: Date | string | null;
};

const WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Đếm số lệnh LOSS liên tiếp gần nhất trong 24h qua.
 * Input phải được sort theo closedAt giảm dần; WIN/BREAKEVEN reset chuỗi.
 */
export function countTrailingLosses(
  trades: ClosedTradeLite[],
  now: Date = new Date(),
): number {
  let count = 0;
  for (const t of trades) {
    if (t.closedAt === null) continue;
    const closed = new Date(t.closedAt).getTime();
    if (!Number.isFinite(closed) || now.getTime() - closed > WINDOW_MS) break;
    if (t.result === "LOSS") {
      count += 1;
      continue;
    }
    if (t.result === "WIN" || t.result === "BREAKEVEN") break;
  }
  return count;
}
