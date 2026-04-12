"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { rateLimit } from "@/lib/rate-limit";
import { parseAndValidateImageUrls } from "@/lib/signal-images";

function optNum(fd: FormData, key: string): number | undefined {
  const raw = fd.get(key);
  if (raw === null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

const createSignalSchema = z.object({
  symbol: z.string().min(3).max(32),
  direction: z.enum(["LONG", "SHORT"]),
  entry: z.coerce.number().positive(),
  stopLoss: z.number().optional(),
  takeProfit: z.number().optional(),
  tier: z.enum(["FREE", "VIP"]),
  notes: z.string().max(2000).optional(),
});

export async function createSignal(
  _prev: { error?: string } | null,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }
  const userId = session.user.id;

  const parsed = createSignalSchema.safeParse({
    symbol: formData.get("symbol"),
    direction: formData.get("direction"),
    entry: formData.get("entry"),
    stopLoss: optNum(formData, "stopLoss"),
    takeProfit: optNum(formData, "takeProfit"),
    tier: formData.get("tier"),
    notes: (formData.get("notes") as string) || undefined,
  });
  if (!parsed.success) {
    return { error: "Dữ liệu không hợp lệ." };
  }

  const { ok } = rateLimit(`signal:${userId}`, 5, 60_000);
  if (!ok) return { error: "Bạn đang đăng quá nhanh. Vui lòng chờ 1 phút." };

  const data = parsed.data;
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { vipUntil: true },
  });
  if (data.tier === "VIP" && !isVipActive(dbUser?.vipUntil)) {
    return {
      error:
        "Chỉ tài khoản VIP (vipUntil) mới đăng được tín hiệu VIP. Liên hệ admin để kích hoạt demo.",
    };
  }

  const imageUrlFields = formData.getAll("imageUrls");
  const imagesParsed = parseAndValidateImageUrls(imageUrlFields);
  if (!imagesParsed.ok) {
    return { error: imagesParsed.error };
  }

  const signal = await prisma.signal.create({
    data: {
      authorId: userId,
      symbol: data.symbol.toUpperCase(),
      direction: data.direction,
      entry: data.entry,
      stopLoss: data.stopLoss,
      takeProfit: data.takeProfit,
      tier: data.tier,
      notes: data.notes,
      images:
        imagesParsed.urls.length > 0
          ? {
              create: imagesParsed.urls.map((url, sortOrder) => ({
                url,
                sortOrder,
              })),
            }
          : undefined,
    },
  });

  revalidatePath("/signals");
  revalidatePath(`/signals/${signal.id}`);
  revalidatePath("/leaderboard");
  redirect("/signals");
}

const closeSignalSchema = z.object({
  signalId: z.string().min(1),
  status: z.enum(["CLOSED_WIN", "CLOSED_LOSS", "CANCELLED"]),
});

export async function closeSignal(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }
  const userId = session.user.id;

  const parsed = closeSignalSchema.safeParse({
    signalId: formData.get("signalId"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: "Không hợp lệ." };
  }

  const { signalId, status } = parsed.data;
  const signal = await prisma.signal.findUnique({
    where: { id: signalId },
  });
  if (!signal || signal.authorId !== userId) {
    return { error: "Không có quyền." };
  }
  if (signal.status !== "ACTIVE") {
    return { error: "Tín hiệu đã đóng." };
  }

  await prisma.signal.update({
    where: { id: signalId },
    data: { status },
  });

  revalidatePath("/signals");
  revalidatePath(`/signals/${signalId}`);
  revalidatePath("/leaderboard");
  return { ok: true };
}
