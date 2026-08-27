"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { revalidateLocalizedPath } from "@/lib/revalidate-locales";
import { MISSIONS_BY_ID } from "@/lib/missions/definitions";
import { getMissionMetrics } from "@/lib/missions/query";
import { isMissionComplete } from "@/lib/missions/evaluate";

export type ClaimMissionResult =
  | { ok: true; xpEarned: number }
  | { ok: false; error: "rate_limited" | "unknown_mission" | "not_complete" | "already_claimed" };

/** Claim the XP for one completed beginner mission. The completion condition is re-checked
 * server-side here — the client's view is never trusted — and the unique [userId, missionId]
 * row guards against a double claim. */
export async function claimMission(missionId: string): Promise<ClaimMissionResult> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const userId = session.user.id;

  const limited = rateLimit(`mission-claim:${userId}`, 15, 60_000);
  if (!limited.ok) return { ok: false, error: "rate_limited" };

  const def = MISSIONS_BY_ID[missionId];
  if (!def) return { ok: false, error: "unknown_mission" };

  const existing = await prisma.userMissionClaim.findUnique({
    where: { userId_missionId: { userId, missionId } },
    select: { id: true },
  });
  if (existing) return { ok: false, error: "already_claimed" };

  const metrics = await getMissionMetrics(userId);
  if (!isMissionComplete(missionId, metrics)) return { ok: false, error: "not_complete" };

  try {
    await prisma.$transaction([
      prisma.userMissionClaim.create({
        data: { userId, missionId, xpAwarded: def.xp },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { xp: { increment: def.xp } },
      }),
    ]);
  } catch {
    // Unique-constraint race — another concurrent claim won.
    return { ok: false, error: "already_claimed" };
  }

  revalidateLocalizedPath("/missions", "page");
  revalidateLocalizedPath("/start", "page");
  revalidateLocalizedPath("/profile", "page");
  return { ok: true, xpEarned: def.xp };
}
