import { realizedR, type RTrade } from "./r-multiple";

export type AdvancedStatsTrade = RTrade & {
  openedAt: string | Date;
  closedAt: string | Date | null;
};

export type StreakInfo = { count: number; type: "WIN" | "LOSS" | null };

export type AdvancedStats = {
  totalTrades: number;
  closedTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number | null;
  profitFactor: number | null;
  avgRR: number | null;
  avgWin: number | null;
  avgLoss: number | null;
  expectancy: number | null;
  netProfit: number;
  grossProfit: number;
  grossLoss: number;
  currentStreak: StreakInfo;
  longestWinStreak: number;
  longestLossStreak: number;
  maxDrawdown: number;
  recoveryFactor: number | null;
  sharpeRatio: number | null;
  avgHoldingMinutes: number | null;
  largestWin: number | null;
  largestLoss: number | null;
  roi: number | null;
  avgRisk: number | null;
  /** Ước tính, null khi thiếu accountBalance hoặc chưa đủ dữ liệu R */
  riskOfRuin: number | null;
};

const MIN_TRADES_FOR_RISK_OF_RUIN = 5;
/** Ngưỡng R coi là "vi phạm risk" — cho phép sai số nhỏ do spread/trượt giá */
export const VIOLATION_R_THRESHOLD = -1.15;

function closedOnly(trades: AdvancedStatsTrade[]) {
  return trades.filter(
    (t) => t.result === "WIN" || t.result === "LOSS" || t.result === "BREAKEVEN",
  );
}

function sortByClosedAtAsc(trades: AdvancedStatsTrade[]) {
  return [...trades]
    .filter((t) => t.closedAt !== null)
    .sort(
      (a, b) => new Date(a.closedAt!).getTime() - new Date(b.closedAt!).getTime(),
    );
}

function computeStreaks(sortedAsc: AdvancedStatsTrade[]): {
  current: StreakInfo;
  longestWin: number;
  longestLoss: number;
} {
  const wl = sortedAsc.filter((t) => t.result === "WIN" || t.result === "LOSS");
  let longestWin = 0;
  let longestLoss = 0;
  let runType: "WIN" | "LOSS" | null = null;
  let runLen = 0;
  for (const t of wl) {
    const type = t.result as "WIN" | "LOSS";
    if (type === runType) runLen += 1;
    else {
      runType = type;
      runLen = 1;
    }
    if (type === "WIN") longestWin = Math.max(longestWin, runLen);
    else longestLoss = Math.max(longestLoss, runLen);
  }
  const current: StreakInfo =
    wl.length > 0 ? { count: runLen, type: runType } : { count: 0, type: null };
  return { current, longestWin, longestLoss };
}

function stddev(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Risk of Ruin ước tính bằng xấp xỉ khuếch tán: RoR = exp(-2*mu*C/sigma^2)
 * với mu/sigma^2 là trung bình/phương sai R, C = số đơn vị R tài khoản chịu được
 * (accountBalance / rủi ro TB mỗi lệnh tính bằng $). Không có edge dương (mu<=0) => RoR = 1.
 */
function estimateRiskOfRuin(
  rValues: number[],
  accountBalance: number | null,
  avgRiskDollar: number | null,
): number | null {
  if (rValues.length < MIN_TRADES_FOR_RISK_OF_RUIN) return null;
  if (!accountBalance || accountBalance <= 0) return null;
  if (!avgRiskDollar || avgRiskDollar <= 0) return null;

  const mu = rValues.reduce((s, r) => s + r, 0) / rValues.length;
  if (mu <= 0) return 1;

  const sigma = stddev(rValues);
  if (sigma === null || sigma <= 0) return null;
  const sigma2 = sigma * sigma;

  const capitalUnits = accountBalance / avgRiskDollar;
  const ror = Math.exp((-2 * mu * capitalUnits) / sigma2);
  return Math.min(1, Math.max(0, ror));
}

export function computeAdvancedStats(
  trades: AdvancedStatsTrade[],
  accountBalance: number | null = null,
): AdvancedStats {
  const closed = closedOnly(trades);
  const wins = closed.filter((t) => t.result === "WIN");
  const losses = closed.filter((t) => t.result === "LOSS");
  const breakevens = closed.filter((t) => t.result === "BREAKEVEN").length;

  const winPnls = wins.map((t) => t.pnl ?? 0);
  const lossPnls = losses.map((t) => Math.abs(t.pnl ?? 0));
  const grossProfit = winPnls.reduce((s, v) => s + v, 0);
  const grossLoss = lossPnls.reduce((s, v) => s + v, 0);
  const netProfit = grossProfit - grossLoss;

  const avgWin = winPnls.length > 0 ? grossProfit / winPnls.length : null;
  const avgLoss = lossPnls.length > 0 ? grossLoss / lossPnls.length : null;
  const expectancy = closed.length > 0 ? netProfit / closed.length : null;

  const rValues = closed
    .map(realizedR)
    .filter((r): r is number => r !== null);
  const avgRR =
    rValues.length > 0
      ? Math.round((rValues.reduce((s, r) => s + r, 0) / rValues.length) * 100) / 100
      : null;

  const winRate =
    wins.length + losses.length > 0
      ? Math.round((wins.length / (wins.length + losses.length)) * 1000) / 10
      : null;
  const profitFactor =
    grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : null;

  const sortedAsc = sortByClosedAtAsc(trades);
  const { current, longestWin, longestLoss } = computeStreaks(sortedAsc);

  let peak = 0;
  let cum = 0;
  let maxDrawdown = 0;
  for (const t of sortedAsc) {
    if (t.result === "PENDING") continue;
    cum += t.pnl ?? 0;
    if (cum > peak) peak = cum;
    const dd = cum - peak;
    if (dd < maxDrawdown) maxDrawdown = dd;
  }
  const recoveryFactor =
    maxDrawdown < 0 ? Math.round((netProfit / Math.abs(maxDrawdown)) * 100) / 100 : null;

  const allPnls = closed.map((t) => t.pnl ?? 0);
  const sharpeStd = stddev(allPnls);
  const sharpeMean =
    allPnls.length > 0 ? allPnls.reduce((s, v) => s + v, 0) / allPnls.length : null;
  const sharpeRatio =
    sharpeStd !== null && sharpeStd > 0 && sharpeMean !== null
      ? Math.round((sharpeMean / sharpeStd) * 100) / 100
      : null;

  const holdingMinutes = closed
    .filter((t) => t.closedAt !== null)
    .map(
      (t) =>
        (new Date(t.closedAt!).getTime() - new Date(t.openedAt).getTime()) / 60000,
    )
    .filter((m) => Number.isFinite(m) && m >= 0);
  const avgHoldingMinutes =
    holdingMinutes.length > 0
      ? Math.round(holdingMinutes.reduce((s, m) => s + m, 0) / holdingMinutes.length)
      : null;

  const largestWin = winPnls.length > 0 ? Math.max(...winPnls) : null;
  const largestLoss = lossPnls.length > 0 ? -Math.max(...lossPnls) : null;

  const roi =
    accountBalance && accountBalance > 0
      ? Math.round((netProfit / accountBalance) * 1000) / 10
      : null;

  const riskOfRuin = estimateRiskOfRuin(rValues, accountBalance, avgLoss);

  return {
    totalTrades: trades.length,
    closedTrades: closed.length,
    wins: wins.length,
    losses: losses.length,
    breakevens,
    winRate,
    profitFactor,
    avgRR,
    avgWin: avgWin !== null ? Math.round(avgWin * 100) / 100 : null,
    avgLoss: avgLoss !== null ? Math.round(avgLoss * 100) / 100 : null,
    expectancy: expectancy !== null ? Math.round(expectancy * 100) / 100 : null,
    netProfit: Math.round(netProfit * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    grossLoss: Math.round(grossLoss * 100) / 100,
    currentStreak: current,
    longestWinStreak: longestWin,
    longestLossStreak: longestLoss,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    recoveryFactor,
    sharpeRatio,
    avgHoldingMinutes,
    largestWin: largestWin !== null ? Math.round(largestWin * 100) / 100 : null,
    largestLoss: largestLoss !== null ? Math.round(largestLoss * 100) / 100 : null,
    roi,
    avgRisk: avgLoss !== null ? Math.round(avgLoss * 100) / 100 : null,
    riskOfRuin,
  };
}
