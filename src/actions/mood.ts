"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { revalidateLocalizedPath } from "@/lib/revalidate-locales";
import { parseMood, type Mood } from "@/lib/journal/mood";
import { utcDayRange } from "@/lib/journal/daily-limit";

export async function setMoodCheckin(
  mood: string,
): Promise<{ ok?: boolean; error?: string; mood?: Mood }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { ok } = rateLimit(`mood-checkin:${session.user.id}`, 20, 60_000);
  if (!ok) return { error: "rate_limited" };

  const parsed = parseMood(mood);
  if (!parsed) return { error: "invalid_mood" };

  const { start } = utcDayRange(new Date());

  await prisma.moodCheckin.upsert({
    where: { userId_day: { userId: session.user.id, day: start } },
    create: { userId: session.user.id, day: start, mood: parsed },
    update: { mood: parsed },
  });

  revalidateLocalizedPath("/journal", "page");
  return { ok: true, mood: parsed };
}
