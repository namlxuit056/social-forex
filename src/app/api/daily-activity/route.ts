import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = todayUTC();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      streakJournal: true,
      streakPlan: true,
      streakSignal: true,
      lastJournalDate: true,
      lastPlanDate: true,
      lastSignalDate: true,
      xp: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const hasJournaledToday = !!user.lastJournalDate && user.lastJournalDate.getTime() >= today.getTime();
  const hasPlannedToday = !!user.lastPlanDate && user.lastPlanDate.getTime() >= today.getTime();
  const hasSignalToday = !!user.lastSignalDate && user.lastSignalDate.getTime() >= today.getTime();

  const todayStart = today;
  const tomorrowStart = new Date(today);
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

  const todayJournals = await prisma.tradeJournal.count({
    where: {
      userId: session.user.id,
      createdAt: { gte: todayStart, lt: tomorrowStart },
    },
  });

  const todaySignals = await prisma.signal.count({
    where: {
      authorId: session.user.id,
      createdAt: { gte: todayStart, lt: tomorrowStart },
    },
  });

  return NextResponse.json({
    journal: hasJournaledToday,
    plan: hasPlannedToday,
    signal: hasSignalToday,
    streaks: {
      journal: user.streakJournal,
      plan: user.streakPlan,
      signal: user.streakSignal,
    },
    xp: user.xp,
    todayCounts: {
      journals: todayJournals,
      signals: todaySignals,
    },
  });
}
