import { prisma } from "@/lib/prisma";

type StreakType = "journal" | "plan" | "signal";

function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function yesterdayUTC(): Date {
  const d = todayUTC();
  d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

export async function updateStreak(userId: string, type: StreakType): Promise<void> {
  const today = todayUTC();
  const yesterday = yesterdayUTC();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      streakJournal: true,
      streakPlan: true,
      streakSignal: true,
      lastJournalDate: true,
      lastPlanDate: true,
      lastSignalDate: true,
    },
  });
  if (!user) return;

  if (type === "journal") {
    const last = user.lastJournalDate;
    if (last && last.getTime() >= today.getTime()) return;
    const newStreak = last && last.getTime() >= yesterday.getTime() ? user.streakJournal + 1 : 1;
    await prisma.user.update({ where: { id: userId }, data: { streakJournal: newStreak, lastJournalDate: today } });
  } else if (type === "plan") {
    const last = user.lastPlanDate;
    if (last && last.getTime() >= today.getTime()) return;
    const newStreak = last && last.getTime() >= yesterday.getTime() ? user.streakPlan + 1 : 1;
    await prisma.user.update({ where: { id: userId }, data: { streakPlan: newStreak, lastPlanDate: today } });
  } else {
    const last = user.lastSignalDate;
    if (last && last.getTime() >= today.getTime()) return;
    const newStreak = last && last.getTime() >= yesterday.getTime() ? user.streakSignal + 1 : 1;
    await prisma.user.update({ where: { id: userId }, data: { streakSignal: newStreak, lastSignalDate: today } });
  }
}
