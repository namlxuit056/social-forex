export type ChecklistDay = {
  planDate: string | Date;
  checkedNews: boolean;
  checkedLevels: boolean;
  checkedRisk: boolean;
  checkedEmotion: boolean;
  checkedJournal: boolean;
};
export type ChecklistTrade = { openedAt: string | Date; result: string };

export type ChecklistGroupStats = {
  total: number;
  wins: number;
  losses: number;
  /** % thắng trong số lệnh W/L — null khi < 2 lệnh W/L */
  winRate: number | null;
};

export type ChecklistComplianceStats = {
  evaluableDays: number;
  completeDays: number;
  /** % ngày hoàn thành đủ 5 mục checklist — null khi chưa có ngày nào có kế hoạch */
  completionRate: number | null;
  /** Lệnh log vào ngày checklist đủ 5/5 mục */
  complete: ChecklistGroupStats;
  /** Lệnh log vào ngày checklist chưa đủ 5/5 mục */
  incomplete: ChecklistGroupStats;
};

function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildGroup(trades: ChecklistTrade[]): ChecklistGroupStats {
  const closed = trades.filter(
    (t) => t.result === "WIN" || t.result === "LOSS" || t.result === "BREAKEVEN",
  );
  const wins = closed.filter((t) => t.result === "WIN").length;
  const losses = closed.filter((t) => t.result === "LOSS").length;
  return {
    total: closed.length,
    wins,
    losses,
    winRate: wins + losses >= 2 ? Math.round((wins / (wins + losses)) * 1000) / 10 : null,
  };
}

/**
 * So win-rate giữa lệnh log vào ngày hoàn thành đủ checklist (5/5 mục DailyTradingPlan)
 * với lệnh log vào ngày checklist chưa đủ — đóng vòng lặp đo lường cho Pre-trade checklist gate
 * (checklist-guard-hint.tsx), vốn trước đó chỉ nhắc nhở chứ không đo tác động.
 */
export function computeChecklistCompliance(
  plans: ChecklistDay[],
  trades: ChecklistTrade[],
): ChecklistComplianceStats {
  if (plans.length === 0) {
    return {
      evaluableDays: 0,
      completeDays: 0,
      completionRate: null,
      complete: buildGroup([]),
      incomplete: buildGroup([]),
    };
  }

  const tradesByDay = new Map<string, ChecklistTrade[]>();
  for (const t of trades) {
    const key = utcDayKey(new Date(t.openedAt));
    const arr = tradesByDay.get(key);
    if (arr) arr.push(t);
    else tradesByDay.set(key, [t]);
  }

  let completeDays = 0;
  const completeTrades: ChecklistTrade[] = [];
  const incompleteTrades: ChecklistTrade[] = [];
  for (const p of plans) {
    const isComplete =
      p.checkedNews && p.checkedLevels && p.checkedRisk && p.checkedEmotion && p.checkedJournal;
    if (isComplete) completeDays += 1;
    const dayTrades = tradesByDay.get(utcDayKey(new Date(p.planDate))) ?? [];
    (isComplete ? completeTrades : incompleteTrades).push(...dayTrades);
  }

  return {
    evaluableDays: plans.length,
    completeDays,
    completionRate: Math.round((completeDays / plans.length) * 1000) / 10,
    complete: buildGroup(completeTrades),
    incomplete: buildGroup(incompleteTrades),
  };
}
