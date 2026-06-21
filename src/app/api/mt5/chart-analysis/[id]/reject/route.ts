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
    select: { id: true, userId: true, status: true },
  });

  if (!proposal || proposal.userId !== userId || proposal.status !== "PENDING_REVIEW") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await prisma.aiTradeProposal.update({
    where: { id },
    data: {
      status: "REJECTED",
      rejectedAt: new Date(),
    },
  });

  revalidatePath("/mt5");

  return NextResponse.json({ ok: true });
}
