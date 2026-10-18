import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function POST(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = todayUTC();
  const todayStr = today.toISOString().slice(0, 10);

  // Find users who want streak reminders and haven't journaled AND haven't planned today
  const users = await prisma.user.findMany({
    where: {
      notifyStreakReminder: true,
      OR: [
        { lastJournalDate: null },
        { lastJournalDate: { lt: today } },
        { lastPlanDate: null },
        { lastPlanDate: { lt: today } },
      ],
    },
    select: { id: true, lastJournalDate: true, lastPlanDate: true },
    take: 1000,
  });

  let created = 0;
  for (const user of users) {
    const needsJournal = !user.lastJournalDate || user.lastJournalDate.getTime() < today.getTime();
    const needsPlan = !user.lastPlanDate || user.lastPlanDate.getTime() < today.getTime();

    if (!needsJournal && !needsPlan) continue;

    const kind = needsJournal && needsPlan ? "journal_plan" : needsJournal ? "journal" : "plan";
    const dedupeKey = `streak-reminder:${todayStr}:${kind}`;

    try {
      await prisma.notification.upsert({
        where: { userId_dedupeKey: { userId: user.id, dedupeKey } },
        create: {
          userId: user.id,
          kind: "STREAK_REMINDER",
          dedupeKey,
        },
        update: {},
      });
      created++;
    } catch {
      // Dedupe constraint — skip
    }
  }

  return NextResponse.json({ ok: true, created });
}
