"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { z } from "zod";

const configSchema = z.object({
  enabled: z.boolean(),
  symbol: z.string().min(3).max(10).toUpperCase(),
  lotSize: z.number().min(0.01).max(100),
  minScore: z.number().int().min(50).max(95),
  minConfidence: z.number().int().min(1).max(5),
  maxPerDay: z.number().int().min(1).max(20),
});

export type AutoScalpConfigData = z.infer<typeof configSchema>;

export async function getAutoScalpConfig(): Promise<AutoScalpConfigData & { lastTradeAt: Date | null } | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const config = await prisma.autoScalpConfig.findUnique({
    where: { userId: session.user.id },
    select: {
      enabled: true,
      symbol: true,
      lotSize: true,
      minScore: true,
      minConfidence: true,
      maxPerDay: true,
      lastTradeAt: true,
    },
  });

  return config;
}

export async function saveAutoScalpConfig(
  data: AutoScalpConfigData,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "unauthorized" };

  const userId = session.user.id;

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { vipUntil: true },
  });
  if (!isVipActive(dbUser?.vipUntil)) return { ok: false, error: "vip_required" };

  const parsed = configSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "invalid_data" };

  await prisma.autoScalpConfig.upsert({
    where: { userId },
    create: { userId, ...parsed.data },
    update: parsed.data,
  });

  revalidatePath("/scalping");
  return { ok: true };
}
