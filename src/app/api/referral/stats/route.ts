import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { referralCode: true },
  });

  if (!user?.referralCode) {
    return NextResponse.json({ referralCode: null, totalReferred: 0, totalVipDays: 0 });
  }

  const [totalReferred, referralEvents] = await Promise.all([
    prisma.user.count({ where: { referredById: session.user.id } }),
    prisma.referralEvent.findMany({
      where: { referrerId: session.user.id },
      select: { rewardDays: true },
    }),
  ]);

  const totalVipDays = referralEvents.reduce((sum, e) => sum + e.rewardDays, 0);

  return NextResponse.json({
    referralCode: user.referralCode,
    totalReferred,
    totalVipDays,
  });
}
