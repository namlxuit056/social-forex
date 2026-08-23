import { prisma } from "@/lib/prisma";
import { TRADER_STATS_MIN_SAMPLE, winRatePercent } from "./public-performance-math";

export type VipWinRateStats = { winRate: number; closedCount: number };

const CACHE_TTL_MS = 15 * 60 * 1000;
let cache: { at: number; stats: VipWinRateStats | null } | null = null;

/**
 * Aggregate win rate across all VIP-tier signals (any author), for the
 * VIP upgrade teaser. Cached in-memory since it's read on every signals
 * list/detail page render.
 */
export async function getVipTierWinRateStats(): Promise<VipWinRateStats | null> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return cache.stats;
  }

  const [wins, losses] = await Promise.all([
    prisma.signal.count({ where: { tier: "VIP", status: "CLOSED_WIN" } }),
    prisma.signal.count({ where: { tier: "VIP", status: "CLOSED_LOSS" } }),
  ]);
  const closedCount = wins + losses;
  const stats =
    closedCount >= TRADER_STATS_MIN_SAMPLE
      ? { winRate: winRatePercent(wins, closedCount), closedCount }
      : null;

  cache = { at: now, stats };
  return stats;
}
