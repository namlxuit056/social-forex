"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { DEMO_CHALLENGE_DAYS, DEMO_CHALLENGE_REWARD_DAYS } from "@/lib/demo-challenge";
import { prisma } from "@/lib/prisma";

const completeDaySchema = z.object({
  day: z.coerce.number().int().min(1).max(DEMO_CHALLENGE_DAYS),
});

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export async function startDemoChallenge() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/challenge");
  }

  await prisma.userDemoChallenge.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id },
    update: {},
  });

  revalidatePath("/challenge");
}

export async function completeDemoChallengeDay(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/challenge");
  }

  const parsed = completeDaySchema.safeParse({ day: formData.get("day") });
  if (!parsed.success) return;

  const { day } = parsed.data;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const progress = await tx.userDemoChallenge.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, completedDays: [day] },
      update: {},
    });

    const completedDays = Array.from(
      new Set([...progress.completedDays, day]),
    ).sort((a, b) => a - b);
    const isComplete = completedDays.length >= DEMO_CHALLENGE_DAYS;
    const shouldGrantReward = isComplete && !progress.rewardGrantedAt;

    await tx.userDemoChallenge.update({
      where: { userId: session.user.id },
      data: {
        completedDays,
        completedAt: isComplete ? (progress.completedAt ?? now) : null,
        rewardGrantedAt: shouldGrantReward
          ? now
          : progress.rewardGrantedAt,
      },
    });

    if (!shouldGrantReward) return;

    const user = await tx.user.findUnique({
      where: { id: session.user.id },
      select: { vipUntil: true },
    });
    const rewardStart =
      user?.vipUntil && user.vipUntil > now ? user.vipUntil : now;
    const vipUntil = addDays(rewardStart, DEMO_CHALLENGE_REWARD_DAYS);

    await tx.user.update({
      where: { id: session.user.id },
      data: { vipUntil },
    });

    await tx.vipAuditLog.create({
      data: {
        adminId: "system:demo-challenge",
        userId: session.user.id,
        action: "challenge_trial",
        days: DEMO_CHALLENGE_REWARD_DAYS,
        vipUntil,
        note: "7-day demo trading challenge reward",
      },
    });
  });

  revalidatePath("/challenge");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
}
