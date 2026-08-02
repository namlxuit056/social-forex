import { realizedR, type RTrade } from "./r-multiple";
import { VIOLATION_R_THRESHOLD } from "./advanced-stats";

export type DisciplineTrade = RTrade & { closedAt: string | Date | null };

export type RiskDisciplineStats = {
  evaluable: number;
  compliant: number;
  violations: number;
  /** % — null khi không có lệnh nào đánh giá được */
  complianceRate: number | null;
  /** Lệnh đã đóng nhưng thiếu SL/exit nên không tính được R */
  insufficientData: number;
};

function closedTrades(trades: DisciplineTrade[]) {
  return trades.filter(
    (t) => t.result === "WIN" || t.result === "LOSS" || t.result === "BREAKEVEN",
  );
}

export function computeRiskDiscipline(trades: DisciplineTrade[]): RiskDisciplineStats {
  const closed = closedTrades(trades);
  let compliant = 0;
  let violations = 0;
  let evaluable = 0;
  for (const t of closed) {
    const r = realizedR(t);
    if (r === null) continue;
    evaluable += 1;
    if (r < VIOLATION_R_THRESHOLD) violations += 1;
    else compliant += 1;
  }
  return {
    evaluable,
    compliant,
    violations,
    complianceRate:
      evaluable > 0 ? Math.round((compliant / evaluable) * 1000) / 10 : null,
    insufficientData: closed.length - evaluable,
  };
}

export type MonthlyViolation = { key: string; label: string; violations: number };

/** Nhóm số lệnh vi phạm risk theo tháng (dựa trên closedAt), sort tăng dần theo thời gian. */
export function computeMonthlyViolations(
  trades: DisciplineTrade[],
  locale: string,
): MonthlyViolation[] {
  const closed = closedTrades(trades);
  const map = new Map<string, number>();
  for (const t of closed) {
    if (t.closedAt === null) continue;
    const r = realizedR(t);
    if (r === null || r >= VIOLATION_R_THRESHOLD) continue;
    const d = new Date(t.closedAt);
    if (!Number.isFinite(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, violations]) => {
      const [y, m] = key.split("-").map(Number);
      const label = new Date(y, m - 1, 1).toLocaleDateString(locale, {
        month: "short",
        year: "2-digit",
      });
      return { key, label, violations };
    });
}
