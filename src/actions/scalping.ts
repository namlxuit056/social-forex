"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { isVipActive } from "@/lib/vip";
import { notifyTelegramNewSignal } from "@/lib/telegram";
import { notifySignalSubscribers } from "@/lib/signals/notify-on-signal-create";
import { Prisma } from "@/generated/prisma/client";

type ChecklistItem = {
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
};

type ScalpingPickData = {
  symbol: string;
  direction: "LONG" | "SHORT";
  entry: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  qualityScore: number;
  reasoning: string;
  checklist: ChecklistItem[];
  lotSize?: number;
};

export async function confirmScalpingPick(
  data: ScalpingPickData,
): Promise<{ ok: boolean; signalId?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "unauthorized" };

  const userId = session.user.id;

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { vipUntil: true },
  });
  if (!isVipActive(dbUser?.vipUntil)) return { ok: false, error: "vip_required" };

  const { ok } = rateLimit(`scalping-confirm:${userId}`, 5, 60_000);
  if (!ok) return { ok: false, error: "rate_limited" };

  const validLot =
    data.lotSize && data.lotSize > 0 ? Math.round(data.lotSize * 100) / 100 : null;

  const notes = [
    `AI Scalping · Confidence: ${data.confidence}/5 · Score: ${data.qualityScore}/100`,
    validLot ? `Lot size: ${validLot}` : null,
    "",
    data.reasoning,
  ]
    .filter((l) => l !== null)
    .join("\n");

  // Look up the MT5 connection first: only when one exists will an AiTradeProposal be
  // created and eventually resolved by the bridge, so only then should the signal start
  // as PENDING (unknown market-vs-pending) instead of ACTIVE (a plain social post).
  const connection = await prisma.mt5Connection.findFirst({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const signal = await prisma.signal.create({
    data: {
      authorId: userId,
      symbol: data.symbol.toUpperCase(),
      direction: data.direction,
      entry: data.entry,
      stopLoss: data.stopLoss,
      takeProfit: data.takeProfit,
      tier: "FREE",
      // The EA decides market-vs-pending against live price only once it actually
      // executes on MT5; until the bridge reports that back, treat this as not-yet-active.
      status: connection ? "PENDING" : "ACTIVE",
      notes,
    },
    select: {
      id: true,
      symbol: true,
      direction: true,
      entry: true,
      stopLoss: true,
      takeProfit: true,
      tier: true,
    },
  });

  if (connection) {
    await prisma.aiTradeProposal.create({
      data: {
        connectionId: connection.id,
        userId,
        symbol: data.symbol.toUpperCase(),
        timeframe: "M5",
        direction: data.direction,
        entry: data.entry,
        stopLoss: data.stopLoss,
        takeProfit: data.takeProfit,
        confidence: data.confidence,
        qualityScore: data.qualityScore,
        reasoning: data.reasoning,
        checklist: JSON.parse(
          JSON.stringify(data.checklist),
        ) as Prisma.InputJsonValue,
        status: "CONFIRMED",
        confirmedAt: new Date(),
        signalId: signal.id,
        lotSize: validLot,
      },
    });
  }

  try {
    await notifySignalSubscribers({
      id: signal.id,
      symbol: signal.symbol,
      tier: signal.tier,
      authorId: userId,
    });
  } catch {
    // Non-blocking
  }

  await notifyTelegramNewSignal({
    id: signal.id,
    symbol: signal.symbol,
    direction: signal.direction,
    entry: signal.entry,
    stopLoss: signal.stopLoss,
    takeProfit: signal.takeProfit,
    tier: signal.tier,
    status: connection ? "PENDING" : "ACTIVE",
  });

  revalidatePath("/signals");
  revalidatePath("/mt5");

  return { ok: true, signalId: signal.id };
}
