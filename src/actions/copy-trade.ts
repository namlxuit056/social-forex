"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { generateReferralCode } from "@/lib/referral";

const copyTradeSchema = z.object({
  providerId: z.string().min(1),
  mode: z.enum(["LOT", "PERCENT"]),
  fixedLot: z.coerce.number().positive().optional(),
  riskPercent: z.coerce.number().min(0.1).max(10).optional(),
  xauusdLot: z.coerce.number().positive().optional(),
  btcusdLot: z.coerce.number().positive().optional(),
});

export async function subscribeCopyTrade(
  _prev: { error?: string; ok?: boolean; token?: string } | null,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean; token?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const t = await getTranslations("errors");
  const parsed = copyTradeSchema.safeParse({
    providerId: formData.get("providerId"),
    mode: formData.get("mode"),
    fixedLot: formData.get("fixedLot") ?? undefined,
    riskPercent: formData.get("riskPercent") ?? undefined,
    // Empty string means "clear the override", not "keep the current value" — map it
    // to undefined so a blank field results in null (fall back to fixedLot).
    xauusdLot: formData.get("xauusdLot") || undefined,
    btcusdLot: formData.get("btcusdLot") || undefined,
  });

  if (!parsed.success) return { error: t("invalidData") };

  const { providerId, mode, fixedLot, riskPercent, xauusdLot, btcusdLot } = parsed.data;
  const followerId = session.user.id;

  if (providerId === followerId) {
    return { error: "Cannot copy yourself" };
  }

  const { ok } = rateLimit(`copy-trade:${followerId}`, 10, 60_000);
  if (!ok) return { error: t("rateLimitOneMinute") };

  const provider = await prisma.user.findUnique({
    where: { id: providerId },
    select: { id: true },
  });
  if (!provider) return { error: "Provider not found" };

  if (mode === "LOT" && (!fixedLot || fixedLot <= 0)) {
    return { error: "Invalid lot size" };
  }
  if (mode === "PERCENT" && (!riskPercent || riskPercent <= 0 || riskPercent > 10)) {
    return { error: "Risk percent must be between 0.1% and 10%" };
  }

  const existing = await prisma.copyTrade.findUnique({
    where: { followerId_providerId: { followerId, providerId } },
  });

  if (existing) {
    await prisma.copyTrade.update({
      where: { id: existing.id },
      data: {
        mode,
        fixedLot,
        riskPercent,
        xauusdLot: xauusdLot ?? null,
        btcusdLot: btcusdLot ?? null,
        isActive: true,
      },
    });
    revalidatePath(`/u/${providerId}`);
    return { ok: true, token: existing.token };
  }

  const token = `ct_${generateReferralCode().toLowerCase()}`;

  await prisma.copyTrade.create({
    data: {
      followerId,
      providerId,
      token,
      mode,
      fixedLot,
      riskPercent,
      xauusdLot,
      btcusdLot,
    },
  });

  revalidatePath(`/u/${providerId}`);
  return { ok: true, token };
}

export async function unsubscribeCopyTrade(providerId: string): Promise<{ ok?: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  await prisma.copyTrade.deleteMany({
    where: { followerId: session.user.id, providerId },
  });

  revalidatePath(`/u/${providerId}`);
  return { ok: true };
}
