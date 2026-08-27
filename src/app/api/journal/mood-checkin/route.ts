import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { utcDayRange } from "@/lib/journal/daily-limit";

export const dynamic = "force-dynamic";

/** Trạng thái tâm lý 1 chạm của hôm nay (UTC) — dùng cho nudge site-wide. */
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ mood: null });
  }

  const { start } = utcDayRange(new Date());
  const checkin = await prisma.moodCheckin.findUnique({
    where: { userId_day: { userId: session.user.id, day: start } },
    select: { mood: true },
  });

  return NextResponse.json({ mood: checkin?.mood ?? null });
}
