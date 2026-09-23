"use server";

import { revalidateLocalizedPath } from "@/lib/revalidate-locales";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const sendSchema = z.object({
  recipientId: z.string().min(1),
  body: z.string().min(1).max(2000),
});

export async function sendDirectMessage(
  _prev: { error?: string } | null,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const t = await getTranslations("errors");

  const parsed = sendSchema.safeParse({
    recipientId: formData.get("recipientId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: t("messageBodyInvalid") };
  }

  const { ok } = rateLimit(`dm:${session.user.id}`, 15, 60_000);
  if (!ok) return { error: t("messageRateLimit") };

  const { recipientId, body } = parsed.data;
  if (recipientId === session.user.id) {
    return { error: t("messageSelf") };
  }

  const target = await prisma.user.findUnique({ where: { id: recipientId } });
  if (!target) {
    return { error: t("recipientNotFound") };
  }

  await prisma.directMessage.create({
    data: {
      senderId: session.user.id,
      recipientId,
      body: body.trim(),
    },
  });

  revalidateLocalizedPath("/messages");
  revalidateLocalizedPath(`/messages/${recipientId}`);
  return { ok: true };
}
