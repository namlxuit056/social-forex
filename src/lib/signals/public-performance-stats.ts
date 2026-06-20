import { prisma } from "@/lib/prisma";
import { calcRR } from "./public-performance-math";

export type ClosedSignalStats = {
  wins: number;
  losses: number;
  total: number;
};

export type SignalPerformanceStats = {
  wins: number;
  losses: number;
  total: number;
  avgRR: number | null;
  consistencyScore: number;
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

export async function getSignalPerformanceStats(
  authorId: string,
  since?: Date,
): Promise<SignalPerformanceStats> {
  const signals = await prisma.signal.findMany({
    where: {
      authorId,
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    select: {
      status: true,
      direction: true,
      entry: true,
      stopLoss: true,
      takeProfit: true,
      createdAt: true,
    },
  });

  let wins = 0;
  let losses = 0;
  const rrValues: number[] = [];
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const activeDays = new Set<string>();

  for (const signal of signals) {
    if (signal.status === "CLOSED_WIN") wins++;
    if (signal.status === "CLOSED_LOSS") losses++;

    if (
      signal.entry != null &&
      signal.stopLoss != null &&
      signal.takeProfit != null
    ) {
      const rr = calcRR(
        signal.direction,
        signal.entry,
        signal.stopLoss,
        signal.takeProfit,
      );
      if (rr !== null) rrValues.push(rr);
    }

    if (signal.createdAt >= thirtyDaysAgo) {
      activeDays.add(signal.createdAt.toISOString().slice(0, 10));
    }
  }

  const avgRR =
    rrValues.length > 0
      ? rrValues.reduce((sum, v) => sum + v, 0) / rrValues.length
      : null;

  const consistencyScore = Math.round((activeDays.size / 30) * 100);

  return {
    wins,
    losses,
    total: wins + losses,
    avgRR,
    consistencyScore,
  };
}
