import { describe, expect, it } from "vitest";
import {
  listTradedPairs,
  parseStatsPair,
  parseStatsRange,
  selectStatsActions,
  splitTradesByRange,
} from "./stats-range";
import type { DisciplineScorecard, RuleResult } from "./discipline-scorecard";
import type { MistakeStats } from "./mistake-stats";
import type { TiltDay, TiltDaysResult } from "./tilt-days";

const NOW = Date.UTC(2026, 9, 6, 12);
const DAY = 24 * 60 * 60 * 1000;

function trade(daysAgo: number, symbol = "EURUSD", closed = true) {
  const ts = new Date(NOW - daysAgo * DAY);
  return { symbol, openedAt: ts, closedAt: closed ? ts : null };
}

describe("parseStatsRange / parseStatsPair", () => {
  it("defaults unknown range to all", () => {
    expect(parseStatsRange(undefined)).toBe("all");
    expect(parseStatsRange("365d")).toBe("all");
    expect(parseStatsRange("30d")).toBe("30d");
  });

  it("normalises pair and rejects junk", () => {
    expect(parseStatsPair(" xauusd ")).toBe("XAUUSD");
    expect(parseStatsPair("")).toBeNull();
    expect(parseStatsPair("<script>")).toBeNull();
  });
});

describe("splitTradesByRange", () => {
  const trades = [trade(1), trade(5), trade(10), trade(20), trade(40, "XAUUSD")];

  it("returns everything and no previous period for all", () => {
    const r = splitTradesByRange(trades, "all", null, NOW);
    expect(r.current).toHaveLength(5);
    expect(r.previous).toHaveLength(0);
  });

  it("splits current and previous window of the same length", () => {
    const r = splitTradesByRange(trades, "7d", null, NOW);
    expect(r.current).toHaveLength(2);
    expect(r.previous).toHaveLength(1); // 10 ngày trước nằm trong [14d, 7d)
  });

  it("filters by pair before splitting", () => {
    const r = splitTradesByRange(trades, "all", "XAUUSD", NOW);
    expect(r.current).toHaveLength(1);
  });

  it("uses openedAt for still-open trades", () => {
    const r = splitTradesByRange([trade(2, "EURUSD", false)], "7d", null, NOW);
    expect(r.current).toHaveLength(1);
  });
});

describe("listTradedPairs", () => {
  it("sorts by trade count desc", () => {
    expect(
      listTradedPairs([{ symbol: "eurusd" }, { symbol: "XAUUSD" }, { symbol: "XAUUSD" }]),
    ).toEqual(["XAUUSD", "EURUSD"]);
  });
});

function rule(overrides: Partial<RuleResult>): RuleResult {
  return {
    id: "hasStopLoss",
    applicable: 10,
    followed: 10,
    followedPct: 100,
    followedWins: 0,
    followedLosses: 0,
    violatedWins: 0,
    violatedLosses: 0,
    followedWinRate: null,
    violatedWinRate: null,
    winRateGap: null,
    followedAvgR: null,
    violatedAvgR: null,
    avgRGap: null,
    followedAvgPnl: null,
    violatedAvgPnl: null,
    avgPnlGap: null,
    ranked: false,
    ...overrides,
  };
}

function scorecard(rules: RuleResult[], topLever: DisciplineScorecard["topLever"]): DisciplineScorecard {
  return { overallScore: 70, sampleSize: 20, rules, topLever };
}

function tiltDay(day: string): TiltDay {
  return { day, tradeCount: 5, netPnl: -50, netR: -3, lossStreak: 3, signals: ["lossStreak", "deepLoss"], trades: [] };
}

const emptyMistakes: MistakeStats = {
  rows: [],
  taggedTrades: 0,
  untaggedClosed: 0,
  withMistakeWinRate: null,
  withoutMistakeWinRate: null,
};

describe("selectStatsActions", () => {
  it("returns nothing when there is nothing to fix", () => {
    expect(selectStatsActions({ scorecard: scorecard([rule({})], null), mistakeStats: emptyMistakes })).toEqual([]);
  });

  it("picks the top lever, costliest mistake and latest tilt day", () => {
    const tilt: TiltDaysResult = {
      tiltDays: [tiltDay("2026-09-01"), tiltDay("2026-10-02")],
      tradingDays: 10,
      tiltNetPnl: -100,
      normalNetPnl: 50,
      tiltWinRate: 20,
      normalWinRate: 60,
    };
    const actions = selectStatsActions({
      scorecard: scorecard(
        [rule({ id: "riskWithinLimit", followedWinRate: 60, violatedWinRate: 30, winRateGap: 30, ranked: true })],
        "riskWithinLimit",
      ),
      mistakeStats: {
        ...emptyMistakes,
        rows: [{ tag: "MOVED_STOP", count: 4, wins: 0, losses: 4, winRate: 0, totalPnl: -120, avgPnl: -30 }],
      },
      tiltDays: tilt,
    });
    expect(actions.map((a) => a.kind)).toEqual(["lever", "mistake", "tilt"]);
    expect(actions[2].kind === "tilt" && actions[2].day.day).toBe("2026-10-02");
  });

  it("falls back to the least-followed rule when no lever is ranked", () => {
    const actions = selectStatsActions({
      scorecard: scorecard(
        [rule({ id: "checklistComplete", followedPct: 40 }), rule({ id: "hasStopLoss", followedPct: 70 })],
        null,
      ),
    });
    expect(actions).toEqual([{ kind: "lowCompliance", rule: "checklistComplete", followedPct: 40 }]);
  });

  it("skips a mistake that did not cost money", () => {
    const actions = selectStatsActions({
      mistakeStats: {
        ...emptyMistakes,
        rows: [{ tag: "CHASED", count: 2, wins: 2, losses: 0, winRate: 100, totalPnl: 40, avgPnl: 20 }],
      },
    });
    expect(actions).toEqual([]);
  });
});
