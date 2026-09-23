"use server";

import { revalidateLocalizedPath } from "@/lib/revalidate-locales";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { invalidateTelegramBroadcasterCache } from "@/lib/telegram";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") throw new Error("Admin permission required.");
}

export type TelegramBroadcasterState =
  | { error: string }
  | { ok: true }
  | null;

const addSchema = z.object({ email: z.string().trim().email().max(200) });

export async function addTelegramBroadcaster(
  _prev: TelegramBroadcasterState,
  formData: FormData,
): Promise<TelegramBroadcasterState> {
  await requireAdmin();

  const parsed = addSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Email không hợp lệ." };

  const user = await prisma.user.findFirst({
    where: { email: { equals: parsed.data.email, mode: "insensitive" } },
    select: { id: true },
  });
  if (!user) return { error: "Không tìm thấy user với email này." };

  await prisma.telegramSignalBroadcaster.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });
  invalidateTelegramBroadcasterCache();

  revalidateLocalizedPath("/admin/telegram-signals");
  return { ok: true };
}

const removeSchema = z.object({ userId: z.string().min(1) });

export async function removeTelegramBroadcaster(
  _prev: TelegramBroadcasterState,
  formData: FormData,
): Promise<TelegramBroadcasterState> {
  await requireAdmin();

  const parsed = removeSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return { error: "Lựa chọn không hợp lệ." };

  await prisma.telegramSignalBroadcaster
    .delete({ where: { userId: parsed.data.userId } })
    .catch(() => null);
  invalidateTelegramBroadcasterCache();

  revalidateLocalizedPath("/admin/telegram-signals");
  return { ok: true };
}
