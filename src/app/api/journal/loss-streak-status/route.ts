import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  COOLDOWN_DURATION_MS,
  COOLDOWN_THRESHOLD_LOSSES,
  getLossStreakCooldown,
} from "@/lib/journal/loss-streak";

export const dynamic = "force-dynamic";

/** Cooldown khoá tạm nút Copy trade / thêm lệnh journal sau chuỗi thua liên tiếp. */
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ active: false, remainingMinutes: 0, lossCount: 0 });
  }

  const recent = await prisma.tradeJournal.findMany({
    where: { userId: session.user.id, closedAt: { not: null } },
    orderBy: { closedAt: "desc" },
    take: 10,
    select: { result: true, closedAt: true },
  });

  const cooldown = getLossStreakCooldown(recent);

  return NextResponse.json({
    active: cooldown.active,
    remainingMinutes: Math.ceil(cooldown.remainingMs / 60000),
    lossCount: cooldown.lossCount,
    thresholdLosses: COOLDOWN_THRESHOLD_LOSSES,
    cooldownMinutes: COOLDOWN_DURATION_MS / 60000,
  });
}
