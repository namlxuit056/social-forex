import { realizedR, type RTrade } from "./r-multiple";

export type GoalTargets = {
  targetWinRate: number | null;
  targetAvgR: number | null;
  targetNetPnl: number | null;
  targetTrades: number | null;
};

export type GoalTrade = RTrade & { closedAt: string | Date | null };

export type GoalMetric = "winRate" | "avgR" | "netPnl" | "trades";

export type GoalProgressItem = {
  metric: GoalMetric;
  target: number;
  actual: number;
  /** 0..1 for a progress bar */
  ratio: number;
  met: boolean;
};

export type GoalProgress = {
  items: GoalProgressItem[];
  metCount: number;
  totalCount: number;
};

function round(n: number) {
  return Math.round(n * 100) / 100;
}

/** Ngày đầu tháng chứa `d`, 00:00 UTC. */
export function goalMonthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** Lệnh đã đóng có closedAt nằm trong tháng UTC bắt đầu tại `monthStart`. */
export function tradesInGoalMonth<
  T extends { closedAt: string | Date | null; result: string },
>(trades: T[], monthStart: Date): T[] {
  const next = new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1),
  );
  return trades.filter((t) => {
    if (t.result === "PENDING" || !t.closedAt) return false;
    const c = new Date(t.closedAt).getTime();
    return c >= monthStart.getTime() && c < next.getTime();
  });
}

/**
 * So target tháng với thực tế. Chỉ tính metric nào có đặt target.
 * `met` = actual >= target. `ratio` clamp 0..1 cho progress bar
 * (target <= 0 thì coi như đạt khi actual >= target).
 */
export function computeGoalProgress(
  targets: GoalTargets,
  monthTrades: GoalTrade[],
): GoalProgress {
  const closed = monthTrades.filter(
    (t) => t.result === "WIN" || t.result === "LOSS" || t.result === "BREAKEVEN",
  );
  const wins = closed.filter((t) => t.result === "WIN").length;
  const losses = closed.filter((t) => t.result === "LOSS").length;
  const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;

  const rValues = closed
    .map(realizedR)
    .filter((r): r is number => r !== null);
  const avgR =
    rValues.length > 0 ? rValues.reduce((s, r) => s + r, 0) / rValues.length : 0;

  const netPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const tradeCount = closed.length;

  const items: GoalProgressItem[] = [];
  const push = (metric: GoalMetric, target: number | null, actual: number) => {
    if (target == null) return;
    const ratio =
      target <= 0
        ? actual >= target
          ? 1
          : 0
        : Math.max(0, Math.min(1, actual / target));
    items.push({ metric, target, actual: round(actual), ratio, met: actual >= target });
  };

  push("winRate", targets.targetWinRate, winRate);
  push("avgR", targets.targetAvgR, avgR);
  push("netPnl", targets.targetNetPnl, netPnl);
  push("trades", targets.targetTrades, tradeCount);

  return {
    items,
    metCount: items.filter((i) => i.met).length,
    totalCount: items.length,
  };
}
