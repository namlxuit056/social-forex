"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { revalidateLocalizedPath } from "@/lib/revalidate-locales";

const num = z
  .union([z.string(), z.number()])
  .transform((v) => Number(v))
  .refine((v) => Number.isFinite(v), "invalid");

const compoundPlanSchema = z
  .object({
    startingCapital: num.refine((v) => v > 0, "range"),
    targetCapital: num.refine((v) => v > 0, "range"),
    dailyTargetPercent: num.refine((v) => v > 0 && v <= 100, "range"),
    dailyStopPercent: num.refine((v) => v > 0 && v <= 100, "range"),
  })
  .refine((d) => d.targetCapital > d.startingCapital, {
    message: "target_below_starting",
    path: ["targetCapital"],
  });

export async function saveCompoundPlan(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { ok } = rateLimit(`compound-plan:${session.user.id}`, 20, 60_000);
  if (!ok) return { error: "rate_limited" };

  const parsed = compoundPlanSchema.safeParse({
    startingCapital: formData.get("startingCapital"),
    targetCapital: formData.get("targetCapital"),
    dailyTargetPercent: formData.get("dailyTargetPercent"),
    dailyStopPercent: formData.get("dailyStopPercent"),
  });
  if (!parsed.success) return { error: "invalid_data" };

  const d = parsed.data;

  await prisma.compoundGrowthPlan.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      startingCapital: d.startingCapital,
      targetCapital: d.targetCapital,
      dailyTargetPercent: d.dailyTargetPercent,
      dailyStopPercent: d.dailyStopPercent,
      startDate: new Date(),
    },
    update: {
      startingCapital: d.startingCapital,
      targetCapital: d.targetCapital,
      dailyTargetPercent: d.dailyTargetPercent,
      dailyStopPercent: d.dailyStopPercent,
      startDate: new Date(),
    },
  });

  revalidateLocalizedPath("/journal", "page");
  return { ok: true };
}
