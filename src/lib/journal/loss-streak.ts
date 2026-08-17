export type ClosedTradeLite = {
  result: string;
  closedAt: Date | string | null;
};

const WINDOW_MS = 24 * 60 * 60 * 1000;

/** Số lệnh LOSS liên tiếp (trong 24h) mà khi chạm tới sẽ bắn push + khoá cooldown. */
export const COOLDOWN_THRESHOLD_LOSSES = 3;
/** Thời gian khoá tạm nút Copy trade / thêm lệnh journal sau khi chạm ngưỡng. */
export const COOLDOWN_DURATION_MS = 30 * 60 * 1000;

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

export type LossStreakCooldown = {
  active: boolean;
  remainingMs: number;
  lossCount: number;
};

/**
 * Cooldown khoá nút "Copy trade" / "Thêm lệnh" khi vừa chạm ngưỡng thua liên tiếp.
 * Neo thời gian khoá vào closedAt của lệnh LOSS gần nhất — không phải lúc gọi hàm.
 * Input phải sort theo closedAt giảm dần, giống countTrailingLosses.
 */
export function getLossStreakCooldown(
  trades: ClosedTradeLite[],
  now: Date = new Date(),
  thresholdLosses: number = COOLDOWN_THRESHOLD_LOSSES,
  cooldownMs: number = COOLDOWN_DURATION_MS,
): LossStreakCooldown {
  const lossCount = countTrailingLosses(trades, now);
  if (lossCount < thresholdLosses) return { active: false, remainingMs: 0, lossCount };

  const mostRecentLoss = trades.find((t) => t.closedAt !== null);
  const closedTime = mostRecentLoss?.closedAt ? new Date(mostRecentLoss.closedAt).getTime() : NaN;
  if (!Number.isFinite(closedTime)) return { active: false, remainingMs: 0, lossCount };

  const remainingMs = cooldownMs - (now.getTime() - closedTime);
  if (remainingMs <= 0) return { active: false, remainingMs: 0, lossCount };

  return { active: true, remainingMs, lossCount };
}
