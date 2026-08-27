import { prisma } from "@/lib/prisma";
import { calcRR } from "@/lib/signals/public-performance-math";
import { buildMissionStates, type MissionMetrics, type MissionState } from "./evaluate";

const GOOD_RR = 1.5;
const CLOSED_RESULTS = ["WIN", "LOSS", "BREAKEVEN"] as const;

export async function getMissionMetrics(userId: string): Promise<MissionMetrics> {
  const [
    academyCompleted,
    priceAlerts,
    following,
    favoriteSymbols,
    journalTotal,
    journalWithSl,
    journalWithSetup,
    guardOverrides,
    plansCompleted,
    moodCheckins,
    weeklyReviews,
    closedTrades,
    journalDays,
  ] = await Promise.all([
    prisma.academyProgress.count({ where: { userId, completed: true } }),
    prisma.priceAlert.count({ where: { userId } }),
    prisma.userFollow.count({ where: { followerId: userId } }),
    prisma.userFavoriteSymbol.count({ where: { userId } }),
    prisma.tradeJournal.count({ where: { userId } }),
    prisma.tradeJournal.count({ where: { userId, stopLoss: { not: null } } }),
    prisma.tradeJournal.count({ where: { userId, setup: { not: null } } }),
    prisma.tradeJournal.count({
      where: { userId, OR: [{ overrodeDailyLimit: true }, { overrodeLossStreakGuard: true }] },
    }),
    prisma.dailyTradingPlan.count({ where: { userId, completedAt: { not: null } } }),
    prisma.moodCheckin.count({ where: { userId } }),
    prisma.aiWeeklyJournalReview.count({ where: { userId } }),
    prisma.tradeJournal.findMany({
      where: { userId, result: { in: [...CLOSED_RESULTS] } },
      select: { direction: true, entry: true, stopLoss: true, takeProfit: true },
    }),
    prisma.tradeJournal.findMany({
      where: { userId },
      select: { createdAt: true },
      take: 1000,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const journalGoodRR = closedTrades.filter((t) => {
    if (t.stopLoss == null || t.takeProfit == null) return false;
    const rr = calcRR(t.direction, t.entry, t.stopLoss, t.takeProfit);
    return rr != null && rr >= GOOD_RR;
  }).length;

  const journalDistinctDays = new Set(
    journalDays.map((t) => t.createdAt.toISOString().slice(0, 10)),
  ).size;

  return {
    academyCompleted,
    priceAlerts,
    following,
    favoriteSymbols,
    journalTotal,
    journalClosed: closedTrades.length,
    journalWithSl,
    journalWithSetup,
    journalGoodRR,
    journalDistinctDays,
    guardOverrides,
    plansCompleted,
    moodCheckins,
    weeklyReviews,
  };
}

export type MissionBoard = {
  missions: MissionState[];
  completedCount: number;
  claimedCount: number;
  totalCount: number;
  /** XP already banked from claimed missions. */
  earnedXp: number;
  /** XP sitting in completed-but-unclaimed missions. */
  claimableXp: number;
};

export async function getMissionBoard(userId: string): Promise<MissionBoard> {
  const [metrics, claims] = await Promise.all([
    getMissionMetrics(userId),
    prisma.userMissionClaim.findMany({ where: { userId }, select: { missionId: true, xpAwarded: true } }),
  ]);

  const claimedIds = new Set(claims.map((c) => c.missionId));
  const missions = buildMissionStates(metrics, claimedIds);

  return {
    missions,
    completedCount: missions.filter((m) => m.complete).length,
    claimedCount: missions.filter((m) => m.claimed).length,
    totalCount: missions.length,
    earnedXp: claims.reduce((sum, c) => sum + c.xpAwarded, 0),
    claimableXp: missions.filter((m) => m.complete && !m.claimed).reduce((sum, m) => sum + m.xp, 0),
  };
}
