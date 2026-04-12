"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

  if (!(await requireStaff(session.user.id))) {
    return { error: "Không có quyền." };
  }

  const parsed = deleteSchema.safeParse({
    signalId: formData.get("signalId"),
  });
  if (!parsed.success) {
    return { error: "Dữ liệu không hợp lệ." };
  }

  const { signalId } = parsed.data;

  try {
    await prisma.signal.delete({ where: { id: signalId } });
  } catch {
    return { error: "Không xóa được (tín hiệu không tồn tại?)." };
  }

  revalidatePath("/signals");
  revalidatePath(`/signals/${signalId}`);
  revalidatePath("/leaderboard");
  revalidatePath("/admin");
  revalidatePath("/admin/signals");
  return { ok: true };
}
