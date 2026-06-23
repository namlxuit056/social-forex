"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { isVipActive } from "@/lib/vip";

type PickData = {
  symbol: string;
  direction: "LONG" | "SHORT";
  entry: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  qualityScore: number;
  reasoning: string;
  lotSize?: number;
};

export async function confirmScreenerPick(
  data: PickData,
): Promise<{ ok: boolean; signalId?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "unauthorized" };

  const userId = session.user.id;

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { vipUntil: true },
  });
  if (!isVipActive(dbUser?.vipUntil)) return { ok: false, error: "vip_required" };

  const { ok } = rateLimit(`screener-confirm:${userId}`, 5, 60_000);
  if (!ok) return { ok: false, error: "rate_limited" };

  const validLot =
    data.lotSize && data.lotSize > 0 ? Math.round(data.lotSize * 100) / 100 : null;

  const notes = [
    `AI Screener · Confidence: ${data.confidence}/5 · Score: ${data.qualityScore}/100`,
    validLot ? `Lot size: ${validLot}` : null,
    "",
    data.reasoning,
  ]
    .filter((l) => l !== null)
    .join("\n");

  const signal = await prisma.signal.create({
    data: {
      authorId: userId,
      symbol: data.symbol.toUpperCase(),
      direction: data.direction,
      entry: data.entry,
      stopLoss: data.stopLoss,
      takeProfit: data.takeProfit,
      tier: "FREE",
      notes,
    },
    select: { id: true },
  });

  revalidatePath("/signals");

  return { ok: true, signalId: signal.id };
}
