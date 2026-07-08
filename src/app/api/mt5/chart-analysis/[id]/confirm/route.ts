import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  const proposal = await prisma.aiTradeProposal.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      status: true,
      symbol: true,
      direction: true,
      entry: true,
      stopLoss: true,
      takeProfit: true,
      confidence: true,
      reasoning: true,
    },
  });

  if (!proposal || proposal.userId !== userId || proposal.status !== "PENDING_REVIEW") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const notes = `AI Trade Proposal · confidence: ${proposal.confidence ?? "?"}/5\n\n${proposal.reasoning}`;

  const signal = await prisma.signal.create({
    data: {
      authorId: userId,
      symbol: proposal.symbol.toUpperCase(),
      direction: proposal.direction as "LONG" | "SHORT",
      entry: proposal.entry,
      stopLoss: proposal.stopLoss ?? undefined,
      takeProfit: proposal.takeProfit ?? undefined,
      tier: "FREE",
      // The EA decides market-vs-pending against live price only once it actually
      // executes on MT5; until the bridge reports that back, treat this as not-yet-active.
      status: "PENDING",
      notes,
    },
    select: { id: true },
  });

  await prisma.aiTradeProposal.update({
    where: { id },
    data: {
      status: "CONFIRMED",
      confirmedAt: new Date(),
      signalId: signal.id,
    },
  });

  revalidatePath("/signals");
  revalidatePath("/mt5");

  return NextResponse.json({ ok: true, signalId: signal.id });
}
