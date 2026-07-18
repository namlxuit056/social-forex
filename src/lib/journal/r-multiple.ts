export type RTrade = {
  direction: string;
  entry: number;
  stopLoss: number | null;
  exitPrice: number | null;
  result: string;
  pnl: number | null;
};

/**
 * R thực tế của một lệnh: (giá thoát − giá vào) / rủi ro 1R (khoảng cách entry→SL).
 * Trả null khi thiếu SL/exit hoặc SL trùng entry.
 */
export function realizedR(t: {
  direction: string;
  entry: number;
  stopLoss: number | null;
  exitPrice: number | null;
}): number | null {
  if (t.stopLoss === null || t.exitPrice === null) return null;
  const risk = Math.abs(t.entry - t.stopLoss);
  if (risk === 0) return null;
  const move =
    t.direction === "SHORT" ? t.entry - t.exitPrice : t.exitPrice - t.entry;
  return Math.round((move / risk) * 100) / 100;
}

export type RStats = {
  /** Kỳ vọng theo R = trung bình realized R của các lệnh đã đóng có tính được R */
  avgR: number | null;
  /** Số lệnh tính được R */
  rCount: number;
  /** TB lãi ($ lệnh WIN) / TB lỗ ($ lệnh LOSS) */
  payoffRatio: number | null;
};

export function computeRStats(trades: RTrade[]): RStats {
  const closed = trades.filter(
    (t) => t.result === "WIN" || t.result === "LOSS" || t.result === "BREAKEVEN",
  );

  const rValues = closed
    .map(realizedR)
    .filter((r): r is number => r !== null);
  const avgR =
    rValues.length > 0
      ? Math.round(
          (rValues.reduce((s, r) => s + r, 0) / rValues.length) * 100,
        ) / 100
      : null;

  const winPnls = closed
    .filter((t) => t.result === "WIN" && t.pnl !== null)
    .map((t) => t.pnl as number);
  const lossPnls = closed
    .filter((t) => t.result === "LOSS" && t.pnl !== null)
    .map((t) => Math.abs(t.pnl as number));
  const avgWin =
    winPnls.length > 0 ? winPnls.reduce((s, v) => s + v, 0) / winPnls.length : null;
  const avgLoss =
    lossPnls.length > 0
      ? lossPnls.reduce((s, v) => s + v, 0) / lossPnls.length
      : null;
  const payoffRatio =
    avgWin !== null && avgLoss !== null && avgLoss > 0
      ? Math.round((avgWin / avgLoss) * 100) / 100
      : null;

  return { avgR, rCount: rValues.length, payoffRatio };
}
