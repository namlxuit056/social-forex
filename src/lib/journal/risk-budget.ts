import { estimateOrderRisk } from "@/lib/calculators";

/**
 * Dollar risk (loss if the stop-loss is hit) of a single trade, computed from
 * entry / SL / lot size at the moment it's logged or queued. Returns null when
 * any input is missing — without a stop there is no bounded risk to measure.
 */
export function computeTradeRiskAmount(params: {
  symbol: string;
  direction: "LONG" | "SHORT";
  entry: number | null | undefined;
  stopLoss: number | null | undefined;
  lotSize: number | null | undefined;
}): number | null {
  const { symbol, direction, entry, stopLoss, lotSize } = params;
  if (!entry || entry <= 0) return null;
  if (!stopLoss || stopLoss <= 0) return null;
  if (!lotSize || lotSize <= 0) return null;

  const { slAmount } = estimateOrderRisk({
    symbol,
    isBuy: direction === "LONG",
    entryPrice: entry,
    volume: lotSize,
    stopLoss,
    takeProfit: null,
  });
  if (slAmount == null || !Number.isFinite(slAmount) || slAmount <= 0) return null;
  return Number(slAmount.toFixed(2));
}

export type DailyRiskBudgetWarning = {
  /** Sum of risk $ already committed today (trades/orders with a computable risk). */
  riskUsedToday: number;
  /** Risk $ of the trade being logged/placed now. */
  newRisk: number;
  /** riskUsedToday + newRisk. */
  projectedRisk: number;
  /** maxRiskPercent% of equity — the daily budget. */
  budget: number;
  maxRiskPercent: number;
  equity: number;
  /** projectedRisk as a % of equity, rounded to 2 dp. */
  projectedPct: number;
};

/**
 * Returns a warning when today's committed risk plus this new trade would exceed
 * `maxRiskPercent`% of account equity. Returns null when the check can't be made
 * — no plan limit, no known equity, or the new trade's risk isn't computable —
 * mirroring how the daily *trade-count* guard silently no-ops without a limit.
 */
export function checkDailyRiskBudget(params: {
  riskUsedToday: number;
  newRisk: number | null;
  maxRiskPercent: number | null | undefined;
  equity: number | null | undefined;
}): DailyRiskBudgetWarning | null {
  const { riskUsedToday, newRisk, maxRiskPercent, equity } = params;
  if (!maxRiskPercent || maxRiskPercent <= 0) return null;
  if (!equity || equity <= 0) return null;
  if (newRisk == null || newRisk <= 0) return null;

  const used = Math.max(0, riskUsedToday);
  const budget = (equity * maxRiskPercent) / 100;
  const projectedRisk = used + newRisk;
  if (projectedRisk <= budget) return null;

  return {
    riskUsedToday: Number(used.toFixed(2)),
    newRisk: Number(newRisk.toFixed(2)),
    projectedRisk: Number(projectedRisk.toFixed(2)),
    budget: Number(budget.toFixed(2)),
    maxRiskPercent,
    equity,
    projectedPct: Number(((projectedRisk / equity) * 100).toFixed(2)),
  };
}
