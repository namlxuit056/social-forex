import { utcDayRange } from "./daily-limit";

export type CompoundPlanConfig = {
  startingCapital: number;
  targetCapital: number;
  dailyTargetPercent: number;
  dailyStopPercent: number;
  startDate: string | Date;
};

export type CompoundPlanTrade = {
  pnl: number | null;
  closedAt: string | Date | null;
  result: string;
};

export type CompoundPlanEta =
  | { kind: "reached" }
  | {
      kind: "projected";
      daysRemaining: number;
      estimatedDate: Date;
      /** false = ước tính theo dailyTargetPercent cấu hình, chưa dựa trên kết quả thực tế */
      basedOnActual: boolean;
    }
  | { kind: "stalled" };

export type CompoundPlanProgress = {
  currentCapital: number;
  todayStartCapital: number;
  todayTargetAmount: number;
  todayStopAmount: number;
  todayPnl: number;
  todayStatus: "target-hit" | "stop-hit" | "in-progress";
  tradingDaysElapsed: number;
  realizedDailyRatePercent: number | null;
  /** 0..100 for a progress bar */
  progressPercent: number;
  eta: CompoundPlanEta;
  /**
   * Lãi kép dailyTargetPercent qua 1 tuần/tháng giao dịch, áp trên vốn đầu
   * tuần/đầu tháng (thứ 2 UTC / ngày 1 UTC) — cố định suốt tuần/tháng đó,
   * không đổi khi xem lại giữa tuần như todayTargetAmount cố định trong ngày.
   */
  weeklyTargetPercent: number;
  weeklyTargetAmount: number;
  monthlyTargetPercent: number;
  monthlyTargetAmount: number;
};

/** Quy ước số ngày giao dịch mỗi tuần/tháng (Forex: Thứ 2–6, ~21 ngày/tháng). */
const TRADING_DAYS_PER_WEEK = 5;
const TRADING_DAYS_PER_MONTH = 21;

/** Thứ 2 (00:00 UTC) của tuần chứa `date`. */
function utcWeekStart(date: Date): Date {
  const dayOfWeek = date.getUTCDay(); // 0 = CN, 1 = T2, ... 6 = T7
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  return start;
}

/** Ngày 1 (00:00 UTC) của tháng chứa `date`. */
function utcMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/** Lệnh đã đóng, closedAt >= startDate. Loại PENDING và trade chưa đóng. */
export function tradesSincePlanStart<T extends CompoundPlanTrade>(
  trades: T[],
  startDate: Date,
): T[] {
  return trades.filter((t) => {
    if (t.result === "PENDING" || !t.closedAt) return false;
    return new Date(t.closedAt).getTime() >= startDate.getTime();
  });
}

function projectDays(currentCapital: number, targetCapital: number, ratePercent: number) {
  const rate = ratePercent / 100;
  return Math.ceil(Math.log(targetCapital / currentCapital) / Math.log(1 + rate));
}

export function computeCompoundPlanProgress(
  plan: CompoundPlanConfig,
  trades: CompoundPlanTrade[],
  now: Date = new Date(),
): CompoundPlanProgress {
  const startDate = new Date(plan.startDate);
  const sinceStart = tradesSincePlanStart(trades, startDate);

  const currentCapital =
    plan.startingCapital + sinceStart.reduce((s, t) => s + (t.pnl ?? 0), 0);

  const { start: todayStart } = utcDayRange(now);
  const todayTrades = sinceStart.filter(
    (t) => new Date(t.closedAt as string | Date).getTime() >= todayStart.getTime(),
  );
  const todayPnl = todayTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const todayStartCapital = currentCapital - todayPnl;

  const todayTargetAmount = (todayStartCapital * plan.dailyTargetPercent) / 100;
  const todayStopAmount = (todayStartCapital * plan.dailyStopPercent) / 100;

  const todayStatus: CompoundPlanProgress["todayStatus"] =
    todayTargetAmount > 0 && todayPnl >= todayTargetAmount
      ? "target-hit"
      : todayStopAmount > 0 && todayPnl <= -todayStopAmount
        ? "stop-hit"
        : "in-progress";

  const tradingDayKeys = new Set(
    sinceStart.map(
      (t) => utcDayRange(new Date(t.closedAt as string | Date)).start.getTime(),
    ),
  );
  const tradingDaysElapsed = tradingDayKeys.size;

  const realizedDailyRatePercent =
    tradingDaysElapsed >= 1 && plan.startingCapital > 0 && currentCapital > 0
      ? (Math.pow(currentCapital / plan.startingCapital, 1 / tradingDaysElapsed) - 1) * 100
      : null;

  const progressPercent =
    plan.targetCapital > plan.startingCapital
      ? Math.max(
          0,
          Math.min(
            100,
            ((currentCapital - plan.startingCapital) /
              (plan.targetCapital - plan.startingCapital)) *
              100,
          ),
        )
      : 0;

  let eta: CompoundPlanEta;
  if (currentCapital >= plan.targetCapital) {
    eta = { kind: "reached" };
  } else if (realizedDailyRatePercent !== null && realizedDailyRatePercent > 0) {
    const daysRemaining = projectDays(
      currentCapital,
      plan.targetCapital,
      realizedDailyRatePercent,
    );
    eta = {
      kind: "projected",
      daysRemaining,
      estimatedDate: new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000),
      basedOnActual: true,
    };
  } else if (tradingDaysElapsed === 0 && plan.dailyTargetPercent > 0) {
    const daysRemaining = projectDays(
      currentCapital,
      plan.targetCapital,
      plan.dailyTargetPercent,
    );
    eta = {
      kind: "projected",
      daysRemaining,
      estimatedDate: new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000),
      basedOnActual: false,
    };
  } else {
    eta = { kind: "stalled" };
  }

  const weekStart = utcWeekStart(now);
  const weekPnl = sinceStart
    .filter((t) => new Date(t.closedAt as string | Date).getTime() >= weekStart.getTime())
    .reduce((s, t) => s + (t.pnl ?? 0), 0);
  const weekStartCapital = currentCapital - weekPnl;

  const monthStart = utcMonthStart(now);
  const monthPnl = sinceStart
    .filter((t) => new Date(t.closedAt as string | Date).getTime() >= monthStart.getTime())
    .reduce((s, t) => s + (t.pnl ?? 0), 0);
  const monthStartCapital = currentCapital - monthPnl;

  const weeklyTargetPercent =
    (Math.pow(1 + plan.dailyTargetPercent / 100, TRADING_DAYS_PER_WEEK) - 1) * 100;
  const weeklyTargetAmount = (weekStartCapital * weeklyTargetPercent) / 100;
  const monthlyTargetPercent =
    (Math.pow(1 + plan.dailyTargetPercent / 100, TRADING_DAYS_PER_MONTH) - 1) * 100;
  const monthlyTargetAmount = (monthStartCapital * monthlyTargetPercent) / 100;

  return {
    currentCapital,
    todayStartCapital,
    todayTargetAmount,
    todayStopAmount,
    todayPnl,
    todayStatus,
    tradingDaysElapsed,
    realizedDailyRatePercent,
    progressPercent,
    eta,
    weeklyTargetPercent,
    weeklyTargetAmount,
    monthlyTargetPercent,
    monthlyTargetAmount,
  };
}
