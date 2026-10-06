import type { DisciplineScorecard, RuleId } from "./discipline-scorecard";
import type { MistakeStats } from "./mistake-stats";
import type { MistakeTag } from "./mistakes";
import type { TiltDay, TiltDaysResult } from "./tilt-days";

export const STATS_RANGES = ["7d", "30d", "90d", "all"] as const;
export type StatsRange = (typeof STATS_RANGES)[number];

const RANGE_DAYS: Record<Exclude<StatsRange, "all">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseStatsRange(v: string | undefined | null): StatsRange {
  return STATS_RANGES.includes(v as StatsRange) ? (v as StatsRange) : "all";
}

/** Chuẩn hoá cặp tiền từ query (?pair=) — null khi trống/không hợp lệ. */
export function parseStatsPair(v: string | undefined | null): string | null {
  if (!v) return null;
  const s = v.trim().toUpperCase();
  return /^[A-Z0-9._]{2,20}$/.test(s) ? s : null;
}

export type RangeTrade = {
  symbol: string;
  openedAt: string | Date;
  closedAt: string | Date | null;
};

/** Mốc thời gian của lệnh khi lọc: lúc đóng (nếu có), không thì lúc mở. */
function tradeTime(t: RangeTrade): number {
  return new Date(t.closedAt ?? t.openedAt).getTime();
}

export type StatsWindow = {
  /** [start, end) của kỳ hiện tại — null start khi range = all */
  start: number | null;
  end: number;
  /** [prevStart, start) của kỳ liền trước cùng độ dài — null khi range = all */
  prevStart: number | null;
};

export function statsWindow(range: StatsRange, now: number): StatsWindow {
  if (range === "all") return { start: null, end: Infinity, prevStart: null };
  const len = RANGE_DAYS[range] * DAY_MS;
  return { start: now - len, end: Infinity, prevStart: now - 2 * len };
}

/**
 * Tách trades thành kỳ hiện tại + kỳ liền trước (cùng độ dài), sau khi lọc cặp tiền.
 * `previous` rỗng khi range = all.
 */
export function splitTradesByRange<T extends RangeTrade>(
  trades: T[],
  range: StatsRange,
  pair: string | null,
  now: number,
): { current: T[]; previous: T[] } {
  const byPair = pair ? trades.filter((t) => t.symbol.toUpperCase() === pair) : trades;
  const w = statsWindow(range, now);
  if (w.start === null || w.prevStart === null) return { current: byPair, previous: [] };
  const current: T[] = [];
  const previous: T[] = [];
  for (const t of byPair) {
    const ts = tradeTime(t);
    if (ts >= w.start) current.push(t);
    else if (ts >= w.prevStart) previous.push(t);
  }
  return { current, previous };
}

/** Danh sách cặp tiền có trong journal, sort theo số lệnh giảm dần. */
export function listTradedPairs(trades: { symbol: string }[]): string[] {
  const counts = new Map<string, number>();
  for (const t of trades) {
    const s = t.symbol.toUpperCase();
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([s]) => s);
}

/* ---------- "3 việc cần làm" ---------- */

/** Mỗi phía cần ngần này lệnh để quy tắc tuân thủ thấp được đề xuất khi chưa có topLever. */
const FALLBACK_RULE_MIN_APPLICABLE = 5;
const FALLBACK_RULE_MAX_PCT = 90;

export type StatsAction =
  | {
      kind: "lever";
      rule: RuleId;
      followedWinRate: number;
      violatedWinRate: number;
      gap: number;
    }
  | { kind: "lowCompliance"; rule: RuleId; followedPct: number }
  | { kind: "mistake"; tag: MistakeTag; count: number; totalPnl: number }
  | { kind: "tilt"; day: TiltDay };

/**
 * Ghép tối đa 3 việc từ các số đã tính sẵn — không gọi AI:
 * 1. quy tắc kỷ luật có đòn bẩy win-rate lớn nhất (fallback: quy tắc tuân thủ thấp nhất)
 * 2. lỗi tốn tiền nhất (tổng P/L âm)
 * 3. ngày tilt gần nhất
 */
export function selectStatsActions(input: {
  scorecard?: DisciplineScorecard | null;
  mistakeStats?: MistakeStats | null;
  tiltDays?: TiltDaysResult | null;
}): StatsAction[] {
  const actions: StatsAction[] = [];
  const { scorecard, mistakeStats, tiltDays } = input;

  if (scorecard) {
    const top = scorecard.topLever
      ? scorecard.rules.find((r) => r.id === scorecard.topLever)
      : undefined;
    if (
      top &&
      top.winRateGap !== null &&
      top.followedWinRate !== null &&
      top.violatedWinRate !== null
    ) {
      actions.push({
        kind: "lever",
        rule: top.id,
        followedWinRate: top.followedWinRate,
        violatedWinRate: top.violatedWinRate,
        gap: top.winRateGap,
      });
    } else {
      const weakest = scorecard.rules
        .filter(
          (r) =>
            r.applicable >= FALLBACK_RULE_MIN_APPLICABLE &&
            r.followedPct !== null &&
            r.followedPct < FALLBACK_RULE_MAX_PCT,
        )
        .sort((a, b) => (a.followedPct ?? 0) - (b.followedPct ?? 0))[0];
      if (weakest && weakest.followedPct !== null) {
        actions.push({ kind: "lowCompliance", rule: weakest.id, followedPct: weakest.followedPct });
      }
    }
  }

  const costliest = mistakeStats?.rows[0];
  if (costliest && costliest.totalPnl < 0) {
    actions.push({
      kind: "mistake",
      tag: costliest.tag,
      count: costliest.count,
      totalPnl: costliest.totalPnl,
    });
  }

  if (tiltDays && tiltDays.tiltDays.length > 0) {
    const latest = [...tiltDays.tiltDays].sort((a, b) => b.day.localeCompare(a.day))[0];
    actions.push({ kind: "tilt", day: latest });
  }

  return actions.slice(0, 3);
}
