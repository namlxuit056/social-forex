"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  guard: z.enum(["lossStreak", "dailyLimit", "checklist", "weakEdge"]),
  surface: z.enum(["copyTrade", "journal", "mt5"]),
});

/**
 * Ghi lại 1 lần user bấm "vẫn tiếp tục" để bỏ qua một guard rủi ro trên bề mặt
 * không có row lệnh riêng để đánh dấu (modal Copy trade). Fire-and-forget từ client;
 * nuốt mọi lỗi để không chặn hành động chính.
 */
export async function logGuardOverride(
  guard: "lossStreak" | "dailyLimit" | "checklist" | "weakEdge",
  surface: "copyTrade" | "journal" | "mt5",
): Promise<void> {
  try {
    const session = await auth();
    if (!session?.user?.id) return;

    const parsed = schema.safeParse({ guard, surface });
    if (!parsed.success) return;

    const { ok } = rateLimit(`guard-override:${session.user.id}`, 20, 60_000);
    if (!ok) return;

    await prisma.guardOverrideEvent.create({
      data: {
        userId: session.user.id,
        guard: parsed.data.guard,
        surface: parsed.data.surface,
      },
    });
  } catch {
    // Non-blocking
  }
}
