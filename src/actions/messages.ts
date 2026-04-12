"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

  const parsed = sendSchema.safeParse({
    recipientId: formData.get("recipientId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: "Nội dung không hợp lệ." };
  }

  const { ok } = rateLimit(`dm:${session.user.id}`, 15, 60_000);
  if (!ok) return { error: "Bạn đang gửi quá nhanh. Vui lòng chờ 1 phút." };

  const { recipientId, body } = parsed.data;
  if (recipientId === session.user.id) {
    return { error: "Không thể nhắn cho chính mình." };
  }

  const target = await prisma.user.findUnique({ where: { id: recipientId } });
  if (!target) {
    return { error: "Người nhận không tồn tại." };
  }

  await prisma.directMessage.create({
    data: {
      senderId: session.user.id,
      recipientId,
      body: body.trim(),
    },
  });

  revalidatePath("/messages");
  revalidatePath(`/messages/${recipientId}`);
  return { ok: true };
}
