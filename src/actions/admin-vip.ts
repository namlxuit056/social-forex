"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === "ADMIN";
}

const grantSchema = z.object({
  email: z.string().email(),
  days: z.coerce.number().int().min(1).max(3650),
});

export async function grantVip(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const t = await getTranslations("errors");
  if (!(await requireAdmin(session.user.id))) {
    return { error: t("adminOnly") };
  }

  const parsed = grantSchema.safeParse({
    email: formData.get("email"),
    days: formData.get("days"),
  });
  if (!parsed.success) return { error: t("invalidData") };

  const { email, days } = parsed.data;

  const target = await prisma.user.findUnique({ where: { email } });
  if (!target) return { error: t("userNotFound", { email }) };

  const vipUntil = new Date();
  vipUntil.setDate(vipUntil.getDate() + days);

  await prisma.user.update({
    where: { email },
    data: { vipUntil },
  });

  await prisma.vipAuditLog.create({
    data: {
      adminId: session.user.id,
      userId: target.id,
      action: "grant",
      days,
      vipUntil,
    },
  });

  revalidatePath("/admin/vip");
  return { ok: true };
}

export async function revokeVip(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  if (!(await requireAdmin(session.user.id))) return;

  const userId = formData.get("userId");
  if (typeof userId !== "string" || !userId) return;

  await prisma.user.update({
    where: { id: userId },
    data: { vipUntil: null },
  });

  await prisma.vipAuditLog.create({
    data: {
      adminId: session.user.id,
      userId,
      action: "revoke",
      days: 0,
      vipUntil: new Date(),
    },
  });

  revalidatePath("/admin/vip");
}
