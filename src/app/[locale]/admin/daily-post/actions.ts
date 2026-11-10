"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { resendDailyPostToTelegram, runDailyMarketPost } from "@/lib/marketing/daily-post";
import { prisma } from "@/lib/prisma";
import { revalidateLocalizedPath } from "@/lib/revalidate-locales";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") throw new Error("Admin permission required.");
}

export type DailyPostActionResult = { ok: true; message: string } | { ok: false; message: string };

/** Writes today's post if missing (rewrite = replace it), without posting to Telegram. */
export async function generateTodaysPost(rewrite: boolean): Promise<DailyPostActionResult> {
  await requireAdmin();
  const result = await runDailyMarketPost({ force: rewrite, sendTelegram: false });
  revalidateLocalizedPath("/admin/daily-post");
  if (!result.ok) return { ok: false, message: result.error ?? "Không tạo được bài." };
  return { ok: true, message: result.generated ? "Đã viết bài hôm nay." : "Bài hôm nay đã có sẵn." };
}

export async function sendPostToTelegram(id: string): Promise<DailyPostActionResult> {
  await requireAdmin();
  const status = await resendDailyPostToTelegram(id);
  revalidateLocalizedPath("/admin/daily-post");
  return status === "sent"
    ? { ok: true, message: "Đã đăng lên kênh Telegram." }
    : { ok: false, message: "Telegram báo lỗi, xem dòng lỗi dưới bài." };
}
