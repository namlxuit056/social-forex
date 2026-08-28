/**
 * MAE/MFE (max adverse / favorable excursion) analytics.
 *
 * For each MT5-linked trade the bridge records the worst (`maeProfit`) and best
 * (`mfeProfit`) floating P/L the position ever showed while open. Comparing those
 * to the realized result answers two questions a plain win-rate can't:
 *  - are you banking winners too early? (low MFE capture)
 *  - are you letting winners turn into losers? (give-back on losers)
 */

export type ExcursionTrade = {
  /** TradeResult: "WIN" | "LOSS" | "BREAKEVEN" | "PENDING" */
  result: string;
  pnl: number | null;
  maeProfit: number | null;
  mfeProfit: number | null;
};

export type ExcursionStats = {
  /** closed trades that carry both MAE and MFE */
  sampleSize: number;
  winnersAnalyzed: number;
  losersAnalyzed: number;
  /** winners: mean(realized pnl / peak unrealised profit), 0..1. Low ⇒ exiting
   *  winners before they mature. null when no winner had a positive MFE. */
  avgMfeCapturePct: number | null;
  /** winners: mean of the deepest underwater $ (≤ 0) reached before the trade
   *  worked out. Big magnitude ⇒ winners run far against you first. */
  avgHeatOnWinners: number | null;
  /** losers that were showing a profit at some point before closing red */
  giveBackCount: number;
  /** those losers: mean peak unrealised profit ($ > 0) that was handed back */
  avgGiveBackOnLosers: number | null;
};

const EPS = 1e-9;

function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

export function computeExcursionStats(trades: ExcursionTrade[]): ExcursionStats {
  const closed = trades.filter(
    (t) =>
      (t.result === "WIN" || t.result === "LOSS" || t.result === "BREAKEVEN") &&
      typeof t.maeProfit === "number" &&
      typeof t.mfeProfit === "number",
  );

  const winners = closed.filter((t) => t.result === "WIN");
  const losers = closed.filter((t) => t.result === "LOSS");

  const captureRatios: number[] = [];
  for (const t of winners) {
    const mfe = t.mfeProfit as number;
    if (mfe > EPS && typeof t.pnl === "number" && t.pnl > 0) {
      captureRatios.push(Math.min(1, t.pnl / mfe));
    }
  }

  const heats = winners.map((t) => Math.min(0, t.maeProfit as number));

  const giveBacks: number[] = [];
  for (const t of losers) {
    const mfe = t.mfeProfit as number;
    if (mfe > EPS) giveBacks.push(mfe);
  }

  return {
    sampleSize: closed.length,
    winnersAnalyzed: winners.length,
    losersAnalyzed: losers.length,
    avgMfeCapturePct: mean(captureRatios),
    avgHeatOnWinners: mean(heats),
    giveBackCount: giveBacks.length,
    avgGiveBackOnLosers: mean(giveBacks),
  };
}
