import { prisma } from "@/lib/prisma";

export type ClosedSignalStats = {
  wins: number;
  losses: number;
  total: number;
};

export { TRADER_STATS_MIN_SAMPLE, winRatePercent } from "./public-performance-math";

export async function getClosedSignalStatsForAuthor(
  authorId: string,
): Promise<ClosedSignalStats> {
  const [wins, losses] = await Promise.all([
    prisma.signal.count({
      where: { authorId, status: "CLOSED_WIN" },
    }),
    prisma.signal.count({
      where: { authorId, status: "CLOSED_LOSS" },
    }),
  ]);
  return { wins, losses, total: wins + losses };
}
