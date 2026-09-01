import { realizedR } from "./r-multiple";
import { VIOLATION_R_THRESHOLD } from "./advanced-stats";
import { classifyDiaryMood } from "./emotion-diary-correlation";

export type ScorecardTrade = {
  direction: string;
  entry: number;
  stopLoss: number | null;
  exitPrice: number | null;
  result: string;
  pnl: number | null;
  openedAt: string | Date;
  setup?: string | null;
  overrodeDailyLimit: boolean;
  overrodeLossStreakGuard: boolean;
};

export type ScorecardPlanDay = {
  planDate: string | Date;
  checkedNews: boolean;
  checkedLevels: boolean;
  checkedRisk: boolean;
  checkedEmotion: boolean;
  checkedJournal: boolean;
};

export type ScorecardMoodDay = { day: string | Date; mood: string };
export type ScorecardDiaryDay = { date: string | Date; note: string };

export type ScorecardInput = {
  trades: ScorecardTrade[];
  plans: ScorecardPlanDay[];
  moods: ScorecardMoodDay[];
  diary: ScorecardDiaryDay[];
  bestSetup: string | null;
};

export type RuleId =
  | "hasStopLoss"
  | "riskWithinLimit"
  | "withinDailyLimit"
  | "noRevengeOverride"
  | "checklistComplete"
  | "positiveMood"
  | "onPlaybook";

/** Thứ tự khai báo = thứ tự hiển thị + tie-break cuối cùng cho topLever. */
export const RULE_IDS: RuleId[] = [
  "hasStopLoss",
  "riskWithinLimit",
  "withinDailyLimit",
  "noRevengeOverride",
  "checklistComplete",
  "positiveMood",
  "onPlaybook",
];

/** Mỗi phía (tuân thủ / vi phạm) cần tối thiểu ngần này lệnh W/L để đưa vào xếp hạng. */
export const MIN_SIDE = 5;

export type RuleResult = {
  id: RuleId;
  /** số lệnh áp dụng được quy tắc */
  applicable: number;
  /** số lệnh tuân thủ trong số áp dụng */
  followed: number;
  /** % tuân thủ trong số áp dụng — null khi applicable === 0 */
  followedPct: number | null;
  followedWins: number;
  followedLosses: number;
  violatedWins: number;
  violatedLosses: number;
  /** win-rate nhóm tuân thủ — null khi < MIN_SIDE lệnh W/L */
  followedWinRate: number | null;
  /** win-rate nhóm vi phạm — null khi < MIN_SIDE lệnh W/L */
  violatedWinRate: number | null;
  /** followedWinRate − violatedWinRate (điểm %) — null khi thiếu 1 phía */
  winRateGap: number | null;
  followedAvgR: number | null;
  violatedAvgR: number | null;
  avgRGap: number | null;
  followedAvgPnl: number | null;
  violatedAvgPnl: number | null;
  avgPnlGap: number | null;
  /** đủ mẫu 2 phía (≥ MIN_SIDE lệnh W/L mỗi phía) để đưa vào xếp hạng đòn bẩy */
  ranked: boolean;
};

export type DisciplineScorecard = {
  /** trung bình điểm kỷ luật mỗi lệnh, 0..100 — null khi sampleSize === 0 */
  overallScore: number | null;
  /** số lệnh đã đóng dùng để chấm */
  sampleSize: number;
  rules: RuleResult[];
  /** quy tắc đầu bảng xếp hạng có winRateGap > 0 — đòn bẩy lớn nhất */
  topLever: RuleId | null;
};

type Verdict = "followed" | "violated" | "na";

const CLOSED = new Set(["WIN", "LOSS", "BREAKEVEN"]);

function utcDayKey(d: string | Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

function round1(n: number): number {
  return Math.round(n * 1000) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function isNegativeDay(mood: string | undefined, diaryMood: string | undefined): boolean {
  if (mood === "tired" || mood === "stressed") return true;
  if (diaryMood === "negative") return true;
  return false;
}

export function computeDisciplineScorecard(input: ScorecardInput): DisciplineScorecard {
  const closed = input.trades.filter((t) => CLOSED.has(t.result));

  const planCompleteByDay = new Map<string, boolean>();
  for (const p of input.plans) {
    planCompleteByDay.set(
      utcDayKey(p.planDate),
      p.checkedNews &&
        p.checkedLevels &&
        p.checkedRisk &&
        p.checkedEmotion &&
        p.checkedJournal,
    );
  }

  const moodByDay = new Map<string, string>();
  for (const m of input.moods) moodByDay.set(utcDayKey(m.day), m.mood);

  const diaryMoodByDay = new Map<string, string>();
  for (const e of input.diary) diaryMoodByDay.set(utcDayKey(e.date), classifyDiaryMood(e.note));

  const bestSetup = input.bestSetup;

  function verdict(rule: RuleId, t: ScorecardTrade): Verdict {
    const dayKey = utcDayKey(t.openedAt);
    switch (rule) {
      case "hasStopLoss":
        return t.stopLoss !== null ? "followed" : "violated";
      case "riskWithinLimit": {
        const r = realizedR(t);
        if (r === null) return "na";
        return r >= VIOLATION_R_THRESHOLD ? "followed" : "violated";
      }
      case "withinDailyLimit":
        return t.overrodeDailyLimit ? "violated" : "followed";
      case "noRevengeOverride":
        return t.overrodeLossStreakGuard ? "violated" : "followed";
      case "checklistComplete": {
        const complete = planCompleteByDay.get(dayKey);
        if (complete === undefined) return "na";
        return complete ? "followed" : "violated";
      }
      case "positiveMood": {
        const mood = moodByDay.get(dayKey);
        const diaryMood = diaryMoodByDay.get(dayKey);
        if (mood === undefined && diaryMood === undefined) return "na";
        return isNegativeDay(mood, diaryMood) ? "violated" : "followed";
      }
      case "onPlaybook": {
        if (!bestSetup || t.setup == null || t.setup === "") return "na";
        return t.setup === bestSetup ? "followed" : "violated";
      }
    }
  }

  // Điểm mỗi lệnh = quy tắc tuân thủ / quy tắc áp dụng
  const perTradeScores: number[] = [];
  for (const t of closed) {
    let applicable = 0;
    let followed = 0;
    for (const rule of RULE_IDS) {
      const v = verdict(rule, t);
      if (v === "na") continue;
      applicable += 1;
      if (v === "followed") followed += 1;
    }
    if (applicable > 0) perTradeScores.push(followed / applicable);
  }

  const avgScore = mean(perTradeScores);

  const rules: RuleResult[] = RULE_IDS.map((rule) => {
    let applicable = 0;
    let followed = 0;
    let followedWins = 0;
    let followedLosses = 0;
    let violatedWins = 0;
    let violatedLosses = 0;
    const followedR: number[] = [];
    const violatedR: number[] = [];
    const followedPnl: number[] = [];
    const violatedPnl: number[] = [];

    for (const t of closed) {
      const v = verdict(rule, t);
      if (v === "na") continue;
      applicable += 1;
      const r = realizedR(t);
      if (v === "followed") {
        followed += 1;
        if (t.result === "WIN") followedWins += 1;
        else if (t.result === "LOSS") followedLosses += 1;
        if (r !== null) followedR.push(r);
        if (t.pnl !== null) followedPnl.push(t.pnl);
      } else {
        if (t.result === "WIN") violatedWins += 1;
        else if (t.result === "LOSS") violatedLosses += 1;
        if (r !== null) violatedR.push(r);
        if (t.pnl !== null) violatedPnl.push(t.pnl);
      }
    }

    const followedWL = followedWins + followedLosses;
    const violatedWL = violatedWins + violatedLosses;
    const followedWinRate = followedWL >= MIN_SIDE ? round1(followedWins / followedWL) : null;
    const violatedWinRate = violatedWL >= MIN_SIDE ? round1(violatedWins / violatedWL) : null;
    const ranked = followedWL >= MIN_SIDE && violatedWL >= MIN_SIDE;

    const followedAvgR = mean(followedR);
    const violatedAvgR = mean(violatedR);
    const followedAvgPnl = mean(followedPnl);
    const violatedAvgPnl = mean(violatedPnl);

    return {
      id: rule,
      applicable,
      followed,
      followedPct: applicable > 0 ? round1(followed / applicable) : null,
      followedWins,
      followedLosses,
      violatedWins,
      violatedLosses,
      followedWinRate,
      violatedWinRate,
      winRateGap:
        followedWinRate !== null && violatedWinRate !== null
          ? Math.round((followedWinRate - violatedWinRate) * 10) / 10
          : null,
      followedAvgR: followedAvgR !== null ? round2(followedAvgR) : null,
      violatedAvgR: violatedAvgR !== null ? round2(violatedAvgR) : null,
      avgRGap:
        followedAvgR !== null && violatedAvgR !== null
          ? round2(followedAvgR - violatedAvgR)
          : null,
      followedAvgPnl: followedAvgPnl !== null ? round2(followedAvgPnl) : null,
      violatedAvgPnl: violatedAvgPnl !== null ? round2(violatedAvgPnl) : null,
      avgPnlGap:
        followedAvgPnl !== null && violatedAvgPnl !== null
          ? round2(followedAvgPnl - violatedAvgPnl)
          : null,
      ranked,
    };
  });

  const candidates = rules.filter(
    (r) => r.ranked && r.winRateGap !== null && r.winRateGap > 0,
  );
  candidates.sort((a, b) => {
    if (b.winRateGap! !== a.winRateGap!) return b.winRateGap! - a.winRateGap!;
    const aPnl = a.avgPnlGap ?? -Infinity;
    const bPnl = b.avgPnlGap ?? -Infinity;
    if (bPnl !== aPnl) return bPnl - aPnl;
    const aR = a.avgRGap ?? -Infinity;
    const bR = b.avgRGap ?? -Infinity;
    if (bR !== aR) return bR - aR;
    return RULE_IDS.indexOf(a.id) - RULE_IDS.indexOf(b.id);
  });

  return {
    overallScore: avgScore !== null ? Math.round(avgScore * 100) : null,
    sampleSize: closed.length,
    rules,
    topLever: candidates[0]?.id ?? null,
  };
}
