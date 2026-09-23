"use server";

import { revalidateLocalizedPath } from "@/lib/revalidate-locales";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteVercelBlobUrls } from "@/lib/vercel-blob-delete";

async function requireStaff(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === "MOD" || user?.role === "ADMIN";
}

const deleteSchema = z.object({ signalId: z.string().min(1) });

export async function adminDeleteSignal(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const t = await getTranslations("errors");

  if (!(await requireStaff(session.user.id))) {
    return { error: t("forbidden") };
  }

  const parsed = deleteSchema.safeParse({
    signalId: formData.get("signalId"),
  });
  if (!parsed.success) {
    return { error: t("invalidData") };
  }

  const { signalId } = parsed.data;

  const existing = await prisma.signal.findUnique({
    where: { id: signalId },
    select: { id: true, images: { select: { url: true } } },
  });
  if (!existing) {
    return { error: t("deleteSignalFailed") };
  }
  const imageUrls = existing.images.map((i) => i.url);

  try {
    await prisma.signal.delete({ where: { id: signalId } });
  } catch {
    return { error: t("deleteSignalFailed") };
  }

  await deleteVercelBlobUrls(imageUrls);

  revalidateLocalizedPath("/signals");
  revalidateLocalizedPath(`/signals/${signalId}`);
  revalidateLocalizedPath("/leaderboard");
  revalidateLocalizedPath("/admin");
  revalidateLocalizedPath("/admin/signals");
  return { ok: true };
}
