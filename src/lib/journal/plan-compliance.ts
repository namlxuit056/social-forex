export type PlanComplianceDay = { planDate: string | Date; maxTrades: number };
export type PlanComplianceTrade = { openedAt: string | Date };

export type PlanComplianceStats = {
  evaluableDays: number;
  compliantDays: number;
  /** % — null khi chưa có ngày nào đặt maxTrades trong kế hoạch */
  complianceRate: number | null;
};

function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * So khớp DailyTradingPlan.maxTrades (chỉ các ngày có đặt) với số lệnh thực tế đã
 * log trong ngày đó (theo openedAt, UTC). Ngày không log lệnh nào tính là tuân thủ.
 */
export function computePlanCompliance(
  plans: PlanComplianceDay[],
  trades: PlanComplianceTrade[],
): PlanComplianceStats {
  if (plans.length === 0) {
    return { evaluableDays: 0, compliantDays: 0, complianceRate: null };
  }

  const tradesPerDay = new Map<string, number>();
  for (const t of trades) {
    const key = utcDayKey(new Date(t.openedAt));
    tradesPerDay.set(key, (tradesPerDay.get(key) ?? 0) + 1);
  }

  let compliantDays = 0;
  for (const p of plans) {
    const key = utcDayKey(new Date(p.planDate));
    const count = tradesPerDay.get(key) ?? 0;
    if (count <= p.maxTrades) compliantDays += 1;
  }

  return {
    evaluableDays: plans.length,
    compliantDays,
    complianceRate: Math.round((compliantDays / plans.length) * 1000) / 10,
  };
}
