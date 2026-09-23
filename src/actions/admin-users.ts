"use server";

import { revalidateLocalizedPath } from "@/lib/revalidate-locales";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const changeRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["USER", "MOD", "ADMIN"]),
});

export async function changeUserRole(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const t = await getTranslations("errors");

  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (admin?.role !== "ADMIN") {
    return { error: t("onlyAdminRole") };
  }

  const parsed = changeRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: t("invalidAdminInput") };

  if (parsed.data.userId === session.user.id) {
    return { error: t("cannotChangeOwnRole") };
  }

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { role: parsed.data.role },
  });

  revalidateLocalizedPath("/admin/users");
  return { ok: true };
}
