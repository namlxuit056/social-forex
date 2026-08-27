import { MISSIONS_BY_ID } from "./definitions";

/** Plain aggregates pulled from the DB (see query.ts). Kept as numbers so this stays a pure,
 * unit-testable mapping with no Prisma types. */
export type MissionMetrics = {
  academyCompleted: number;
  priceAlerts: number;
  following: number;
  favoriteSymbols: number;
  journalTotal: number;
  journalClosed: number;
  journalWithSl: number;
  journalWithSetup: number;
  /** Closed trades whose planned reward-to-risk (entry→TP vs entry→SL) is ≥ 1.5. */
  journalGoodRR: number;
  /** Count of distinct UTC calendar days the user logged at least one trade on. */
  journalDistinctDays: number;
  /** Trades where a daily-limit or loss-streak guard was overridden. */
  guardOverrides: number;
  plansCompleted: number;
  moodCheckins: number;
  weeklyReviews: number;
};

/** The "progress bar" numerator for a mission — how far the user has got. */
export function missionValue(missionId: string, m: MissionMetrics): number {
  switch (missionId) {
    case "academy-first":
    case "academy-5":
      return m.academyCompleted;
    case "alert-first":
      return m.priceAlerts;
    case "follow-trader":
      return m.following;
    case "watchlist-3":
      return m.favoriteSymbols;
    case "journal-first":
    case "journal-5":
      return m.journalTotal;
    case "journal-with-sl":
      return m.journalWithSl;
    case "journal-setup-3":
      return m.journalWithSetup;
    case "plan-first":
    case "plan-3":
      return m.plansCompleted;
    case "rr-discipline":
      return m.journalGoodRR;
    case "discipline-clean":
      return m.journalClosed;
    case "mood-5":
      return m.moodCheckins;
    case "weekly-review":
      return m.weeklyReviews;
    case "journal-days-5":
      return m.journalDistinctDays;
    default:
      return 0;
  }
}

export function isMissionComplete(missionId: string, m: MissionMetrics): boolean {
  const def = MISSIONS_BY_ID[missionId];
  if (!def) return false;
  const value = missionValue(missionId, m);
  if (value < def.target) return false;
  // "discipline-clean" also requires the guard-override count to stay low.
  if (missionId === "discipline-clean" && m.guardOverrides > 1) return false;
  return true;
}

export type MissionState = {
  id: string;
  value: number;
  target: number;
  complete: boolean;
  claimed: boolean;
  xp: number;
};

export function buildMissionStates(
  m: MissionMetrics,
  claimedIds: ReadonlySet<string>,
): MissionState[] {
  return Object.values(MISSIONS_BY_ID).map((def) => ({
    id: def.id,
    value: Math.min(missionValue(def.id, m), def.target),
    target: def.target,
    complete: isMissionComplete(def.id, m),
    claimed: claimedIds.has(def.id),
    xp: def.xp,
  }));
}
