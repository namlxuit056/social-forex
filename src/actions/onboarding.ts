"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { addXp } from "@/lib/add-xp";
import { getOnboardingStatus } from "@/lib/onboarding";

export async function claimOnboardingBonus(): Promise<{
  ok?: boolean;
  xpEarned?: number;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const userId = session.user.id;

  const limited = rateLimit(`onboarding-claim:${userId}`, 5, 60_000);
  if (!limited.ok) return { error: "rate_limited" };

  const status = await getOnboardingStatus(userId);
  if (status.bonusClaimedAt) return { error: "already_claimed" };
  if (!status.allDone) return { error: "not_complete" };

  // Guard against double-claim: only flip onboardingBonusAt if still null
  const updated = await prisma.user.updateMany({
    where: { id: userId, onboardingBonusAt: null },
    data: { onboardingBonusAt: new Date() },
  });
  if (updated.count === 0) return { error: "already_claimed" };

  const { xpEarned } = await addXp(userId, "onboardingComplete");

  revalidatePath("/start");
  return { ok: true, xpEarned };
}
