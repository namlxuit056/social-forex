"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

// --- Comments ---

const commentSchema = z.object({
  signalId: z.string().min(1),
  body: z.string().min(1).max(1000),
});

export async function addSignalComment(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const parsed = commentSchema.safeParse({
    signalId: formData.get("signalId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { error: "Nội dung không hợp lệ." };

  const { ok } = rateLimit(`sig-comment:${session.user.id}`, 10, 60_000);
  if (!ok) return { error: "Bạn bình luận quá nhanh." };

  await prisma.signalComment.create({
    data: {
      signalId: parsed.data.signalId,
      authorId: session.user.id,
      body: parsed.data.body,
    },
  });

  revalidatePath(`/signals/${parsed.data.signalId}`);
  return { ok: true };
}

// --- Reactions ---

export async function toggleSignalReaction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const signalId = formData.get("signalId");
  const type = formData.get("type");
  if (typeof signalId !== "string" || (type !== "LIKE" && type !== "DISLIKE"))
    return;

  const existing = await prisma.signalReaction.findUnique({
    where: { signalId_userId: { signalId, userId: session.user.id } },
  });

  if (existing) {
    if (existing.type === type) {
      await prisma.signalReaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.signalReaction.update({
        where: { id: existing.id },
        data: { type },
      });
    }
  } else {
    await prisma.signalReaction.create({
      data: { signalId, userId: session.user.id, type },
    });
  }

  revalidatePath(`/signals/${signalId}`);
  revalidatePath("/signals");
}
