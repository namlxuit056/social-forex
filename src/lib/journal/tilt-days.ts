import { realizedR } from "./r-multiple";

export type TiltTrade = {
  symbol: string;
  direction: string;
  entry: number;
  stopLoss: number | null;
  exitPrice: number | null;
  result: string;
  pnl: number | null;
  lotSize: number | null;
  openedAt: string | Date;
  closedAt: string | Date | null;
  emotion: string | null;
  mistakes: string[];
  overrodeDailyLimit: boolean;
  overrodeLossStreakGuard: boolean;
};

export type TiltPlanDay = { planDate: string | Date; maxTrades: number | null };

export type TiltSignal =
  | "lossStreak"
  | "sizeEscalation"
  | "overtrading"
  | "guardOverride"
  | "revenge"
  | "deepLoss";

export type TiltDayTrade = {
  symbol: string;
  result: string;
  pnl: number | null;
  lotSize: number | null;
};

export type TiltDay = {
  /** YYYY-MM-DD (UTC) */
  day: string;
  tradeCount: number;
  netPnl: number;
  /** tổng realized R trong ngày — null khi không lệnh nào tính được R */
  netR: number | null;
  /** chuỗi thua liên tiếp dài nhất trong ngày */
  lossStreak: number;
  signals: TiltSignal[];
  trades: TiltDayTrade[];
};

export type TiltDaysResult = {
  /** ngày tilt, sort số tín hiệu desc → netPnl asc */
  tiltDays: TiltDay[];
  /** số ngày có ≥ 1 lệnh đã đóng */
  tradingDays: number;
  tiltNetPnl: number;
  normalNetPnl: number;
  tiltWinRate: number | null;
  normalWinRate: number | null;
};

export const LOSS_STREAK_MIN = 3;
export const OVERTRADE_ABS = 6;
export const OVERTRADE_PLAN_MARGIN = 2;
export const DEEP_LOSS_R = -3;
export const TILT_SIGNAL_MIN = 2;

const CLOSED = new Set(["WIN", "LOSS", "BREAKEVEN"]);
const REVENGE_MISTAKES = new Set(["REVENGE", "OVERTRADING", "CHASED"]);

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function utcDayKey(d: string | Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

function orderInDay(a: TiltTrade, b: TiltTrade): number {
  const at = new Date(a.closedAt ?? a.openedAt).getTime();
  const bt = new Date(b.closedAt ?? b.openedAt).getTime();
  return at - bt;
}

function winRateOf(wins: number, losses: number): number | null {
  return wins + losses >= 2 ? Math.round((wins / (wins + losses)) * 1000) / 10 : null;
}

function maxLossStreak(dayTrades: TiltTrade[]): number {
  let max = 0;
  let run = 0;
  for (const t of dayTrades) {
    if (t.result === "LOSS") {
      run += 1;
      if (run > max) max = run;
    } else {
      run = 0;
    }
  }
  return max;
}

function hasSizeEscalation(dayTrades: TiltTrade[]): boolean {
  for (let i = 1; i < dayTrades.length; i++) {
    const prev = dayTrades[i - 1];
    const cur = dayTrades[i];
    if (
      prev.result === "LOSS" &&
      prev.lotSize !== null &&
      cur.lotSize !== null &&
      cur.lotSize > prev.lotSize
    ) {
      return true;
    }
  }
  return false;
}

export function computeTiltDays(
  trades: TiltTrade[],
  plans: TiltPlanDay[] = [],
): TiltDaysResult {
  const closed = trades.filter((t) => CLOSED.has(t.result));

  const planMaxByDay = new Map<string, number>();
  for (const p of plans) {
    if (p.maxTrades != null) planMaxByDay.set(utcDayKey(p.planDate), p.maxTrades);
  }

  const byDay = new Map<string, TiltTrade[]>();
  for (const t of closed) {
    const key = utcDayKey(t.closedAt ?? t.openedAt);
    const arr = byDay.get(key);
    if (arr) arr.push(t);
    else byDay.set(key, [t]);
  }

  const tradingDays = byDay.size;
  const tiltDays: TiltDay[] = [];
  let tiltNetPnl = 0;
  let normalNetPnl = 0;
  let tiltWins = 0;
  let tiltLosses = 0;
  let normalWins = 0;
  let normalLosses = 0;

  for (const [day, dayTradesRaw] of byDay) {
    const dayTrades = [...dayTradesRaw].sort(orderInDay);
    const netPnl = round2(
      dayTrades.reduce((s, t) => s + (t.pnl ?? 0), 0),
    );
    const rValues = dayTrades
      .map((t) => realizedR(t))
      .filter((r): r is number => r !== null);
    const netR = rValues.length > 0 ? round2(rValues.reduce((s, r) => s + r, 0)) : null;
    const lossStreak = maxLossStreak(dayTrades);
    const wins = dayTrades.filter((t) => t.result === "WIN").length;
    const losses = dayTrades.filter((t) => t.result === "LOSS").length;

    const signals: TiltSignal[] = [];
    if (lossStreak >= LOSS_STREAK_MIN) signals.push("lossStreak");
    if (hasSizeEscalation(dayTrades)) signals.push("sizeEscalation");

    const planMax = planMaxByDay.get(day);
    if (
      dayTrades.length >= OVERTRADE_ABS ||
      (planMax != null && dayTrades.length >= planMax + OVERTRADE_PLAN_MARGIN)
    ) {
      signals.push("overtrading");
    }

    if (dayTrades.some((t) => t.overrodeDailyLimit || t.overrodeLossStreakGuard)) {
      signals.push("guardOverride");
    }

    if (
      dayTrades.some(
        (t) =>
          t.emotion === "REVENGE" ||
          t.mistakes.some((m) => REVENGE_MISTAKES.has(m)),
      )
    ) {
      signals.push("revenge");
    }

    if (netR !== null && netR <= DEEP_LOSS_R) signals.push("deepLoss");

    const isTilt = signals.length >= TILT_SIGNAL_MIN;
    if (isTilt) {
      tiltNetPnl += netPnl;
      tiltWins += wins;
      tiltLosses += losses;
      tiltDays.push({
        day,
        tradeCount: dayTrades.length,
        netPnl,
        netR,
        lossStreak,
        signals,
        trades: dayTrades.map((t) => ({
          symbol: t.symbol,
          result: t.result,
          pnl: t.pnl,
          lotSize: t.lotSize,
        })),
      });
    } else {
      normalNetPnl += netPnl;
      normalWins += wins;
      normalLosses += losses;
    }
  }

  tiltDays.sort((a, b) => {
    if (b.signals.length !== a.signals.length) return b.signals.length - a.signals.length;
    return a.netPnl - b.netPnl;
  });

  return {
    tiltDays,
    tradingDays,
    tiltNetPnl: round2(tiltNetPnl),
    normalNetPnl: round2(normalNetPnl),
    tiltWinRate: winRateOf(tiltWins, tiltLosses),
    normalWinRate: winRateOf(normalWins, normalLosses),
  };
}
