import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { utcDayRange } from "@/lib/journal/daily-limit";

export const dynamic = "force-dynamic";

const CHECKLIST_TOTAL = 5;

/** Trạng thái checklist DailyTradingPlan của ngày hôm nay (UTC) — dùng cho nhắc nhở mềm khi log trade/copy-trade. */
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ complete: true, checkedCount: 0, total: CHECKLIST_TOTAL });
  }

  const { start } = utcDayRange(new Date());
  const plan = await prisma.dailyTradingPlan.findUnique({
    where: { userId_planDate: { userId: session.user.id, planDate: start } },
    select: {
      checkedNews: true,
      checkedLevels: true,
      checkedRisk: true,
      checkedEmotion: true,
      checkedJournal: true,
      completedAt: true,
    },
  });

  if (!plan) {
    return NextResponse.json({ complete: false, checkedCount: 0, total: CHECKLIST_TOTAL });
  }

  const checkedCount = [
    plan.checkedNews,
    plan.checkedLevels,
    plan.checkedRisk,
    plan.checkedEmotion,
    plan.checkedJournal,
  ].filter(Boolean).length;

  return NextResponse.json({
    complete: plan.completedAt !== null,
    checkedCount,
    total: CHECKLIST_TOTAL,
  });
}
