"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { revalidateLocalizedPath } from "@/lib/revalidate-locales";
import { goalMonthStart } from "@/lib/journal/goal-progress";

const optNum = z
  .union([z.string(), z.number(), z.null()])
  .transform((v) => (v === "" || v === null ? null : Number(v)))
  .refine((v) => v === null || Number.isFinite(v), "invalid")
  .nullable();

const goalSchema = z.object({
  targetWinRate: optNum.refine((v) => v === null || (v >= 0 && v <= 100), "range"),
  targetAvgR: optNum,
  targetNetPnl: optNum,
  targetTrades: optNum.refine((v) => v === null || (v >= 0 && v <= 100000), "range"),
  note: z.string().max(500).optional().nullable(),
});

export async function saveTradingGoal(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { ok } = rateLimit(`trading-goal:${session.user.id}`, 20, 60_000);
  if (!ok) return { error: "rate_limited" };

  const parsed = goalSchema.safeParse({
    targetWinRate: formData.get("targetWinRate"),
    targetAvgR: formData.get("targetAvgR"),
    targetNetPnl: formData.get("targetNetPnl"),
    targetTrades: formData.get("targetTrades"),
    note: (formData.get("note") as string) || null,
  });
  if (!parsed.success) return { error: "invalid_data" };

  const d = parsed.data;
  const month = goalMonthStart(new Date());

  const allEmpty =
    d.targetWinRate == null &&
    d.targetAvgR == null &&
    d.targetNetPnl == null &&
    d.targetTrades == null;

  if (allEmpty) {
    await prisma.tradingGoal.deleteMany({
      where: { userId: session.user.id, month },
    });
  } else {
    await prisma.tradingGoal.upsert({
      where: { userId_month: { userId: session.user.id, month } },
      create: {
        userId: session.user.id,
        month,
        targetWinRate: d.targetWinRate,
        targetAvgR: d.targetAvgR,
        targetNetPnl: d.targetNetPnl,
        targetTrades: d.targetTrades == null ? null : Math.round(d.targetTrades),
        note: d.note ?? null,
      },
      update: {
        targetWinRate: d.targetWinRate,
        targetAvgR: d.targetAvgR,
        targetNetPnl: d.targetNetPnl,
        targetTrades: d.targetTrades == null ? null : Math.round(d.targetTrades),
        note: d.note ?? null,
      },
    });
  }

  revalidateLocalizedPath("/journal", "page");
  return { ok: true };
}
