"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { isVipActive } from "@/lib/vip";
import { createScreenerSignal, type ScreenerPickData } from "@/lib/signals/create-screener-signal";

export async function confirmScreenerPick(
  data: ScreenerPickData,
): Promise<{ ok: boolean; signalId?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "unauthorized" };

  const userId = session.user.id;

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { vipUntil: true },
  });
  if (!isVipActive(dbUser?.vipUntil)) return { ok: false, error: "vip_required" };

  const { ok } = rateLimit(`screener-confirm:${userId}`, 5, 60_000);
  if (!ok) return { ok: false, error: "rate_limited" };

  const { signalId } = await createScreenerSignal(userId, data, "TV_MULTI");

  revalidatePath("/signals");
  revalidatePath("/mt5");

  return { ok: true, signalId };
}
