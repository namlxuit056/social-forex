import { prisma } from "@/lib/prisma";
import { calculateXp, type XpAction } from "@/lib/xp";

export async function addXp(
  userId: string,
  action: XpAction,
  currentStreak?: number,
): Promise<{ xpEarned: number; totalXp: number }> {
  const xpEarned = calculateXp(action, currentStreak);
  const user = await prisma.user.update({
    where: { id: userId },
    data: { xp: { increment: xpEarned } },
    select: { xp: true },
  });
  return { xpEarned, totalXp: user.xp };
}
