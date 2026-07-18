"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";

/** Lưu ngôn ngữ ưa thích để push notification gửi đúng tiếng. Fire-and-forget từ switcher. */
export async function setPreferredLocale(locale: string) {
  const session = await auth();
  if (!session?.user?.id) return;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) return;
  await prisma.user.update({
    where: { id: session.user.id },
    data: { locale },
  });
}
