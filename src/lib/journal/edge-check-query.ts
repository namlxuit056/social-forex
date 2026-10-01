import { prisma } from "@/lib/prisma";
import { computeEdgeCheck, type EdgeCheckResult } from "./edge-check";

/** Cùng trần với stats/edge trên /journal. */
const EDGE_CHECK_TRADE_CAP = 2000;

export async function getEdgeCheck(
  userId: string,
  context: { symbol: string; direction: string; at?: Date | null },
): Promise<EdgeCheckResult | null> {
  const trades = await prisma.tradeJournal.findMany({
    where: { userId, result: { in: ["WIN", "LOSS"] } },
    orderBy: { openedAt: "desc" },
    take: EDGE_CHECK_TRADE_CAP,
    select: { symbol: true, direction: true, result: true, openedAt: true },
  });
  return computeEdgeCheck(trades, context);
}
