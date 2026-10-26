import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { syncTradingAgentsRun } from "@/lib/trading-agents/client";

export const dynamic = "force-dynamic";

/** Poll target for an unfinished run: syncs it from the sidecar and returns its status. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { vipUntil: true, role: true },
  });
  if (dbUser?.role !== "ADMIN" && !isVipActive(dbUser?.vipUntil)) {
    return NextResponse.json({ error: "vip_required" }, { status: 403 });
  }

  const { id } = await params;
  const run = await prisma.tradingAgentsRun.findUnique({ where: { id } });
  if (!run) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const synced = await syncTradingAgentsRun(run);
  return NextResponse.json({ status: synced.status, rating: synced.rating, error: synced.error });
}
