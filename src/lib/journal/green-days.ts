import { realizedR } from "./r-multiple";
import { sessionOfUtcHour, type EdgeSession } from "./edge-stats";

export type GreenTrade = {
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
  setup: string | null;
  mistakes: string[];
  overrodeDailyLimit: boolean;
  overrodeLossStreakGuard: boolean;
};

export type GreenPlanDay = {
  planDate: string | Date;
  maxTrades: number | null;
  checkedNews: boolean;
  checkedLevels: boolean;
  checkedRisk: boolean;
  checkedEmotion: boolean;
  checkedJournal: boolean;
};

export type GreenMoodDay = { day: string | Date; mood: string };

export type GreenSignal =
  | "checklistDone"
  | "withinLimit"
  | "allHaveStop"
  | "noMistakes"
  | "steadyMood"
  | "hitTarget"
  | "onPlaybook";

export type GreenDayTrade = {
  symbol: string;
  result: string;
  pnl: number | null;
  lotSize: number | null;
};

export type GreenDay = {
  /** YYYY-MM-DD (UTC) */
  day: string;
  tradeCount: number;
  netPnl: number;
  netR: number | null;
  signals: GreenSignal[];
  trades: GreenDayTrade[];
};

export type GreenDaysCommon = {
  symbol: string | null;
  setup: string | null;
  session: EdgeSession | null;
  avgTradeCount: number | null;
  mood: string | null;
};

export type GreenDaysResult = {
  /** ngày tốt, sort số tín hiệu desc → netPnl desc */
  greenDays: GreenDay[];
  tradingDays: number;
  greenNetPnl: number;
  otherNetPnl: number;
  greenWinRate: number | null;
  otherWinRate: number | null;
  common: GreenDaysCommon;
};

export const GREEN_SIGNAL_MIN = 3;
export const GREEN_TARGET_R = 2;
export const DISCIPLINED_MAX_TRADES = 4;

const CLOSED = new Set(["WIN", "LOSS", "BREAKEVEN"]);
const UNSTEADY_EMOTIONS = new Set(["REVENGE", "FOMO"]);

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function utcDayKey(d: string | Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

function winRateOf(wins: number, losses: number): number | null {
  return wins + losses >= 2 ? Math.round((wins / (wins + losses)) * 1000) / 10 : null;
}

/** Giá trị xuất hiện nhiều nhất (mode); null khi mảng rỗng. Tie → phần tử gặp trước. */
function mode<T>(values: T[]): T | null {
  const counts = new Map<T, number>();
  let best: T | null = null;
  let bestN = 0;
  for (const v of values) {
    const n = (counts.get(v) ?? 0) + 1;
    counts.set(v, n);
    if (n > bestN) {
      bestN = n;
      best = v;
    }
  }
  return best;
}

export function computeGreenDays(
  trades: GreenTrade[],
  plans: GreenPlanDay[] = [],
  moods: GreenMoodDay[] = [],
  bestSetup: string | null = null,
): GreenDaysResult {
  const closed = trades.filter((t) => CLOSED.has(t.result));

  const planByDay = new Map<string, GreenPlanDay>();
  for (const p of plans) planByDay.set(utcDayKey(p.planDate), p);

  const moodByDay = new Map<string, string>();
  for (const m of moods) moodByDay.set(utcDayKey(m.day), m.mood);

  const byDay = new Map<string, GreenTrade[]>();
  for (const t of closed) {
    const key = utcDayKey(t.closedAt ?? t.openedAt);
    const arr = byDay.get(key);
    if (arr) arr.push(t);
    else byDay.set(key, [t]);
  }

  const tradingDays = byDay.size;
  const greenDays: GreenDay[] = [];
  let greenNetPnl = 0;
  let otherNetPnl = 0;
  let greenWins = 0;
  let greenLosses = 0;
  let otherWins = 0;
  let otherLosses = 0;

  for (const [day, dayTrades] of byDay) {
    const netPnl = round2(dayTrades.reduce((s, t) => s + (t.pnl ?? 0), 0));
    const rValues = dayTrades
      .map((t) => realizedR(t))
      .filter((r): r is number => r !== null);
    const netR = rValues.length > 0 ? round2(rValues.reduce((s, r) => s + r, 0)) : null;
    const wins = dayTrades.filter((t) => t.result === "WIN").length;
    const losses = dayTrades.filter((t) => t.result === "LOSS").length;

    const plan = planByDay.get(day);
    const mood = moodByDay.get(day);

    const noMistakes = dayTrades.every((t) => t.mistakes.length === 0);
    const noGuardOverride = dayTrades.every(
      (t) => !t.overrodeDailyLimit && !t.overrodeLossStreakGuard,
    );

    const signals: GreenSignal[] = [];

    if (
      plan &&
      plan.checkedNews &&
      plan.checkedLevels &&
      plan.checkedRisk &&
      plan.checkedEmotion &&
      plan.checkedJournal
    ) {
      signals.push("checklistDone");
    }

    const limit = plan?.maxTrades ?? DISCIPLINED_MAX_TRADES;
    if (dayTrades.length <= limit) signals.push("withinLimit");

    if (dayTrades.every((t) => t.stopLoss !== null)) signals.push("allHaveStop");

    if (noMistakes) signals.push("noMistakes");

    const emotionOk = dayTrades.every(
      (t) => t.emotion === null || !UNSTEADY_EMOTIONS.has(t.emotion),
    );
    if ((mood === "good" || mood === "ok") && emotionOk) signals.push("steadyMood");

    if (netR !== null && netR >= GREEN_TARGET_R) signals.push("hitTarget");

    if (bestSetup) {
      const setupTagged = dayTrades.filter((t) => t.setup != null && t.setup !== "");
      if (setupTagged.length > 0 && setupTagged.every((t) => t.setup === bestSetup)) {
        signals.push("onPlaybook");
      }
    }

    const isGreen =
      signals.length >= GREEN_SIGNAL_MIN && noMistakes && noGuardOverride;

    if (isGreen) {
      greenNetPnl += netPnl;
      greenWins += wins;
      greenLosses += losses;
      greenDays.push({
        day,
        tradeCount: dayTrades.length,
        netPnl,
        netR,
        signals,
        trades: dayTrades.map((t) => ({
          symbol: t.symbol,
          result: t.result,
          pnl: t.pnl,
          lotSize: t.lotSize,
        })),
      });
    } else {
      otherNetPnl += netPnl;
      otherWins += wins;
      otherLosses += losses;
    }
  }

  greenDays.sort((a, b) => {
    if (b.signals.length !== a.signals.length) return b.signals.length - a.signals.length;
    return b.netPnl - a.netPnl;
  });

  // "Chân dung" ngày tốt — mode trên toàn bộ lệnh của các ngày tốt
  const greenDayKeys = new Set(greenDays.map((d) => d.day));
  const greenTrades = closed.filter((t) =>
    greenDayKeys.has(utcDayKey(t.closedAt ?? t.openedAt)),
  );
  const common: GreenDaysCommon = {
    symbol: mode(greenTrades.map((t) => t.symbol)),
    setup: mode(
      greenTrades
        .map((t) => t.setup)
        .filter((s): s is string => s != null && s !== ""),
    ),
    session: mode(
      greenTrades.map((t) => sessionOfUtcHour(new Date(t.openedAt).getUTCHours())),
    ),
    avgTradeCount:
      greenDays.length > 0
        ? Math.round(
            greenDays.reduce((s, d) => s + d.tradeCount, 0) / greenDays.length,
          )
        : null,
    mood: mode(
      greenDays
        .map((d) => moodByDay.get(d.day))
        .filter((m): m is string => m != null),
    ),
  };

  return {
    greenDays,
    tradingDays,
    greenNetPnl: round2(greenNetPnl),
    otherNetPnl: round2(otherNetPnl),
    greenWinRate: winRateOf(greenWins, greenLosses),
    otherWinRate: winRateOf(otherWins, otherLosses),
    common,
  };
}
