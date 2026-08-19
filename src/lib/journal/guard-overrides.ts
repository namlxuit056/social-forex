export type GuardOverrideTrade = {
  overrodeDailyLimit: boolean;
  overrodeLossStreakGuard: boolean;
};

export type GuardOverrideStats = {
  dailyLimitOverrides: number;
  lossStreakOverrides: number;
  totalOverrides: number;
};

/** Đếm số lệnh trader bấm "vẫn lưu"/"vẫn tiếp tục" để bỏ qua daily-limit hoặc loss-streak guard. */
export function computeGuardOverrideStats(trades: GuardOverrideTrade[]): GuardOverrideStats {
  let dailyLimitOverrides = 0;
  let lossStreakOverrides = 0;
  for (const t of trades) {
    if (t.overrodeDailyLimit) dailyLimitOverrides += 1;
    if (t.overrodeLossStreakGuard) lossStreakOverrides += 1;
  }
  return {
    dailyLimitOverrides,
    lossStreakOverrides,
    totalOverrides: dailyLimitOverrides + lossStreakOverrides,
  };
}
