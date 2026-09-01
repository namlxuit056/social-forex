import { describe, expect, it } from "vitest";
import {
  computeDisciplineScorecard,
  MIN_SIDE,
  type ScorecardInput,
  type ScorecardTrade,
} from "./discipline-scorecard";

const DAY = "2026-08-10T09:00:00.000Z";

function trade(overrides: Partial<ScorecardTrade> = {}): ScorecardTrade {
  return {
    direction: "LONG",
    entry: 100,
    stopLoss: 99,
    exitPrice: 102,
    result: "WIN",
    pnl: 20,
    openedAt: DAY,
    setup: null,
    overrodeDailyLimit: false,
    overrodeLossStreakGuard: false,
    ...overrides,
  };
}

function input(overrides: Partial<ScorecardInput> = {}): ScorecardInput {
  return {
    trades: [],
    plans: [],
    moods: [],
    diary: [],
    bestSetup: null,
    ...overrides,
  };
}

describe("computeDisciplineScorecard", () => {
  it("returns nulls / zero for an empty or all-pending set", () => {
    const emptyResult = computeDisciplineScorecard(input());
    expect(emptyResult.overallScore).toBeNull();
    expect(emptyResult.sampleSize).toBe(0);
    expect(emptyResult.topLever).toBeNull();

    const pending = computeDisciplineScorecard(
      input({ trades: [trade({ result: "PENDING" }), trade({ result: "PENDING" })] }),
    );
    expect(pending.overallScore).toBeNull();
    expect(pending.sampleSize).toBe(0);
  });

  it("scores a fully disciplined trade at 100 and a fully undisciplined one lower", () => {
    // One clean trade: SL present, R ok, no overrides. 4 rules apply (no
    // plan / mood / bestSetup) → all followed.
    const clean = computeDisciplineScorecard(input({ trades: [trade()] }));
    expect(clean.overallScore).toBe(100);

    // No SL, blew past risk (exit far below entry on a long), both guards overridden.
    const messy = computeDisciplineScorecard(
      input({
        trades: [
          trade({
            stopLoss: null,
            exitPrice: null,
            result: "LOSS",
            pnl: -80,
            overrodeDailyLimit: true,
            overrodeLossStreakGuard: true,
          }),
        ],
      }),
    );
    // applicable = hasStopLoss + withinDailyLimit + noRevengeOverride = 3, followed = 0
    expect(messy.overallScore).toBe(0);
  });

  it("only counts a rule as applicable when its data is present", () => {
    const res = computeDisciplineScorecard(input({ trades: [trade({ setup: null })] }));
    const onPlaybook = res.rules.find((r) => r.id === "onPlaybook")!;
    expect(onPlaybook.applicable).toBe(0);
    expect(onPlaybook.followedPct).toBeNull();

    const checklist = res.rules.find((r) => r.id === "checklistComplete")!;
    expect(checklist.applicable).toBe(0);
  });

  it("checklistComplete applies only on days with a plan and reads the 5 flags", () => {
    const res = computeDisciplineScorecard(
      input({
        trades: [trade(), trade({ openedAt: "2026-08-11T09:00:00.000Z" })],
        plans: [
          {
            planDate: "2026-08-10T00:00:00.000Z",
            checkedNews: true,
            checkedLevels: true,
            checkedRisk: true,
            checkedEmotion: true,
            checkedJournal: true,
          },
          {
            planDate: "2026-08-11T00:00:00.000Z",
            checkedNews: true,
            checkedLevels: false,
            checkedRisk: true,
            checkedEmotion: true,
            checkedJournal: true,
          },
        ],
      }),
    );
    const checklist = res.rules.find((r) => r.id === "checklistComplete")!;
    expect(checklist.applicable).toBe(2);
    expect(checklist.followed).toBe(1);
  });

  it("positiveMood marks a day violated for a negative check-in or a negative diary note", () => {
    const res = computeDisciplineScorecard(
      input({
        trades: [
          trade({ openedAt: "2026-08-10T09:00:00.000Z" }), // stressed mood
          trade({ openedAt: "2026-08-11T09:00:00.000Z" }), // negative diary
          trade({ openedAt: "2026-08-12T09:00:00.000Z" }), // good mood
        ],
        moods: [
          { day: "2026-08-10T00:00:00.000Z", mood: "stressed" },
          { day: "2026-08-12T00:00:00.000Z", mood: "good" },
        ],
        diary: [{ date: "2026-08-11T00:00:00.000Z", note: "hôm nay quá mệt mỏi và mất tập trung" }],
      }),
    );
    const mood = res.rules.find((r) => r.id === "positiveMood")!;
    expect(mood.applicable).toBe(3);
    expect(mood.followed).toBe(1);
  });

  it("ranks a rule only when both sides have at least MIN_SIDE W/L trades", () => {
    // MIN_SIDE followed wins + MIN_SIDE violated losses, driven by the SL rule.
    const trades: ScorecardTrade[] = [];
    for (let i = 0; i < MIN_SIDE; i++) {
      trades.push(trade({ result: "WIN", pnl: 30 })); // has SL → followed
      trades.push(trade({ stopLoss: null, exitPrice: null, result: "LOSS", pnl: -20 })); // no SL → violated
    }
    const res = computeDisciplineScorecard(input({ trades }));
    const sl = res.rules.find((r) => r.id === "hasStopLoss")!;
    expect(sl.ranked).toBe(true);
    expect(sl.followedWinRate).toBe(100);
    expect(sl.violatedWinRate).toBe(0);
    expect(sl.winRateGap).toBe(100);
    expect(res.topLever).toBe("hasStopLoss");

    // One short of MIN_SIDE on the violated side → not ranked.
    const res2 = computeDisciplineScorecard(input({ trades: trades.slice(0, trades.length - 1) }));
    const sl2 = res2.rules.find((r) => r.id === "hasStopLoss")!;
    expect(sl2.ranked).toBe(false);
    expect(sl2.winRateGap).toBeNull();
  });

  it("picks the rule with the biggest positive win-rate gap as topLever", () => {
    const trades: ScorecardTrade[] = [];
    // hasStopLoss: followed 60% (3W/2L), violated 40% (2W/3L) → gap 20
    for (let i = 0; i < 3; i++) trades.push(trade({ result: "WIN" }));
    for (let i = 0; i < 2; i++) trades.push(trade({ result: "LOSS", pnl: -10 }));
    for (let i = 0; i < 2; i++)
      trades.push(trade({ stopLoss: null, exitPrice: null, result: "WIN" }));
    for (let i = 0; i < 3; i++)
      trades.push(trade({ stopLoss: null, exitPrice: null, result: "LOSS", pnl: -10 }));
    // withinDailyLimit: followed 100% (all above are non-override), violated 0% (5L overrides)
    for (let i = 0; i < 5; i++)
      trades.push(trade({ result: "LOSS", pnl: -10, overrodeDailyLimit: true }));

    const res = computeDisciplineScorecard(input({ trades }));
    // withinDailyLimit gap should now be the largest positive one
    expect(res.topLever).toBe("withinDailyLimit");
  });

  it("computes avg R and avg PnL gaps per rule when data allows", () => {
    const trades: ScorecardTrade[] = [];
    for (let i = 0; i < MIN_SIDE; i++)
      trades.push(trade({ result: "WIN", exitPrice: 103, pnl: 30 })); // R = +3
    for (let i = 0; i < MIN_SIDE; i++)
      trades.push(
        trade({ result: "LOSS", exitPrice: 98, pnl: -20, overrodeLossStreakGuard: true }), // R = -2
      );
    const res = computeDisciplineScorecard(input({ trades }));
    const revenge = res.rules.find((r) => r.id === "noRevengeOverride")!;
    expect(revenge.followedAvgR).toBe(3);
    expect(revenge.violatedAvgR).toBe(-2);
    expect(revenge.avgRGap).toBe(5);
    expect(revenge.avgPnlGap).toBe(50);
  });
});
