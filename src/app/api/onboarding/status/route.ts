import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOnboardingStatus } from "@/lib/onboarding";
import { XP_VALUES } from "@/lib/xp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await getOnboardingStatus(session.user.id);
  return NextResponse.json({
    steps: status.steps,
    completedCount: status.completedCount,
    allDone: status.allDone,
    bonusClaimed: status.bonusClaimedAt !== null,
    bonusXp: XP_VALUES.onboardingComplete,
  });
}
