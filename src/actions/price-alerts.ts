"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";
import {
  ALERT_COOLDOWN_DEFAULT,
  ALERT_COOLDOWN_OPTIONS,
  type AlertCooldownMinutes,
} from "@/lib/price-alert-options";

const VALID_SYMBOLS = QUOTE_DEFINITIONS.map((d) => d.symbol);

const createSchema = z.object({
  symbol: z.string().refine((s) => VALID_SYMBOLS.includes(s), "invalid_symbol"),
  targetPrice: z.coerce.number().positive(),
  direction: z.enum(["ABOVE", "BELOW"]),
  repeat: z.enum(["once", "recurring"]).default("once"),
  cooldownMinutes: z.coerce
    .number()
    .refine((n): n is AlertCooldownMinutes =>
      ALERT_COOLDOWN_OPTIONS.includes(n as AlertCooldownMinutes),
    )
    .default(ALERT_COOLDOWN_DEFAULT),
});

function alertLimit(isVip: boolean) {
  return isVip ? 20 : 5;
}

export async function createPriceAlert(
  _prev: { ok?: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const userId = session.user.id;

  const parsed = createSchema.safeParse({
    symbol: formData.get("symbol"),
    targetPrice: formData.get("targetPrice"),
    direction: formData.get("direction"),
    repeat: formData.get("repeat") ?? undefined,
    cooldownMinutes: formData.get("cooldownMinutes") ?? undefined,
  });
  if (!parsed.success) return { error: "invalid_data" };

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { vipUntil: true },
  });
  const vip = isVipActive(dbUser?.vipUntil);
  const limit = alertLimit(vip);

  const activeCount = await prisma.priceAlert.count({
    where: { userId, isActive: true },
  });
  if (activeCount >= limit) return { error: "limit_reached" };

  const { repeat, cooldownMinutes, ...alertData } = parsed.data;
  await prisma.priceAlert.create({
    data: {
      userId,
      ...alertData,
      isRecurring: repeat === "recurring",
      cooldownMinutes,
    },
  });

  revalidatePath("/alerts");
  return { ok: true };
}

export async function deletePriceAlert(
  id: string,
): Promise<{ ok?: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  await prisma.priceAlert.deleteMany({
    where: { id, userId: session.user.id },
  });

  revalidatePath("/alerts");
  return { ok: true };
}
