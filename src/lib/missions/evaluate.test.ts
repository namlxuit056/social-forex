import { describe, expect, it } from "vitest";
import { MISSIONS, TOTAL_MISSION_XP } from "./definitions";
import { buildMissionStates, isMissionComplete, missionValue, type MissionMetrics } from "./evaluate";

const ZERO: MissionMetrics = {
  academyCompleted: 0,
  priceAlerts: 0,
  following: 0,
  favoriteSymbols: 0,
  journalTotal: 0,
  journalClosed: 0,
  journalWithSl: 0,
  journalWithSetup: 0,
  journalGoodRR: 0,
  journalDistinctDays: 0,
  guardOverrides: 0,
  plansCompleted: 0,
  moodCheckins: 0,
  weeklyReviews: 0,
};

function m(partial: Partial<MissionMetrics>): MissionMetrics {
  return { ...ZERO, ...partial };
}

describe("mission catalog", () => {
  it("has unique ids and a positive xp total", () => {
    const ids = MISSIONS.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(TOTAL_MISSION_XP).toBeGreaterThan(0);
  });
});

describe("missionValue", () => {
  it("maps each mission to the right metric", () => {
    expect(missionValue("academy-5", m({ academyCompleted: 3 }))).toBe(3);
    expect(missionValue("watchlist-3", m({ favoriteSymbols: 2 }))).toBe(2);
    expect(missionValue("journal-5", m({ journalTotal: 4 }))).toBe(4);
    expect(missionValue("rr-discipline", m({ journalGoodRR: 5 }))).toBe(5);
    expect(missionValue("journal-days-5", m({ journalDistinctDays: 1 }))).toBe(1);
  });

  it("returns 0 for an unknown mission id", () => {
    expect(missionValue("nope", ZERO)).toBe(0);
  });
});

describe("isMissionComplete", () => {
  it("completes a simple count mission when the target is met", () => {
    expect(isMissionComplete("alert-first", m({ priceAlerts: 1 }))).toBe(true);
    expect(isMissionComplete("alert-first", ZERO)).toBe(false);
    expect(isMissionComplete("watchlist-3", m({ favoriteSymbols: 3 }))).toBe(true);
    expect(isMissionComplete("watchlist-3", m({ favoriteSymbols: 2 }))).toBe(false);
  });

  it("discipline-clean needs the trade count AND a low override count", () => {
    expect(isMissionComplete("discipline-clean", m({ journalClosed: 10, guardOverrides: 1 }))).toBe(true);
    expect(isMissionComplete("discipline-clean", m({ journalClosed: 10, guardOverrides: 2 }))).toBe(false);
    expect(isMissionComplete("discipline-clean", m({ journalClosed: 9, guardOverrides: 0 }))).toBe(false);
  });

  it("returns false for an unknown mission id", () => {
    expect(isMissionComplete("nope", ZERO)).toBe(false);
  });
});

describe("buildMissionStates", () => {
  it("clamps progress to target and reflects claim state", () => {
    const states = buildMissionStates(m({ academyCompleted: 9, priceAlerts: 1 }), new Set(["alert-first"]));
    const academy5 = states.find((s) => s.id === "academy-5")!;
    expect(academy5.value).toBe(5); // clamped from 9
    expect(academy5.complete).toBe(true);
    expect(academy5.claimed).toBe(false);

    const alert = states.find((s) => s.id === "alert-first")!;
    expect(alert.claimed).toBe(true);
  });

  it("produces one state per catalog mission", () => {
    expect(buildMissionStates(ZERO, new Set())).toHaveLength(MISSIONS.length);
  });
});
