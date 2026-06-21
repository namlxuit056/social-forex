"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function confirmAiTradeProposal(
  proposalId: string,
): Promise<{ ok: boolean; signalId?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "unauthorized" };
  }
  const userId = session.user.id;

  const proposal = await prisma.aiTradeProposal.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      userId: true,
      status: true,
      symbol: true,
      timeframe: true,
      direction: true,
      entry: true,
      stopLoss: true,
      takeProfit: true,
      confidence: true,
      reasoning: true,
    },
  });

  if (!proposal || proposal.userId !== userId || proposal.status !== "PENDING_REVIEW") {
    return { ok: false, error: "not_found" };
  }

  const notes = `AI Trade Proposal · ${proposal.timeframe} · confidence: ${proposal.confidence ?? "?"}/5\n\n${proposal.reasoning}`;

  const signal = await prisma.signal.create({
    data: {
      authorId: userId,
      symbol: proposal.symbol.toUpperCase(),
      direction: proposal.direction as "LONG" | "SHORT",
      entry: proposal.entry,
      stopLoss: proposal.stopLoss ?? undefined,
      takeProfit: proposal.takeProfit ?? undefined,
      tier: "FREE",
      notes,
    },
    select: { id: true },
  });

  await prisma.aiTradeProposal.update({
    where: { id: proposalId },
    data: {
      status: "CONFIRMED",
      confirmedAt: new Date(),
      signalId: signal.id,
    },
  });

  revalidatePath("/mt5");
  revalidatePath("/signals");

  return { ok: true, signalId: signal.id };
}

export async function rejectAiTradeProposal(
  proposalId: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "unauthorized" };
  }
  const userId = session.user.id;

  const proposal = await prisma.aiTradeProposal.findUnique({
    where: { id: proposalId },
    select: { id: true, userId: true, status: true },
  });

  if (!proposal || proposal.userId !== userId || proposal.status !== "PENDING_REVIEW") {
    return { ok: false, error: "not_found" };
  }

  await prisma.aiTradeProposal.update({
    where: { id: proposalId },
    data: {
      status: "REJECTED",
      rejectedAt: new Date(),
    },
  });

  revalidatePath("/mt5");

  return { ok: true };
}
