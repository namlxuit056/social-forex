import { prisma } from "@/lib/prisma";

export const ONBOARDING_STEPS = ["journal", "follow", "alert", "academy"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export type OnboardingStatus = {
  steps: Record<OnboardingStep, boolean>;
  completedCount: number;
  allDone: boolean;
  bonusClaimedAt: Date | null;
};

export async function getOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  const [journalCount, followCount, alertCount, academyCount, user] = await Promise.all([
    prisma.tradeJournal.count({ where: { userId } }),
    prisma.userFollow.count({ where: { followerId: userId } }),
    prisma.priceAlert.count({ where: { userId } }),
    prisma.academyProgress.count({ where: { userId, completed: true } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingBonusAt: true },
    }),
  ]);

  const steps: Record<OnboardingStep, boolean> = {
    journal: journalCount > 0,
    follow: followCount > 0,
    alert: alertCount > 0,
    academy: academyCount > 0,
  };
  const completedCount = Object.values(steps).filter(Boolean).length;

  return {
    steps,
    completedCount,
    allDone: completedCount === ONBOARDING_STEPS.length,
    bonusClaimedAt: user?.onboardingBonusAt ?? null,
  };
}
