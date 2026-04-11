"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function toggleFollowUser(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }
  const targetId = formData.get("targetUserId");
  if (typeof targetId !== "string" || !targetId) {
    return;
  }
  if (targetId === session.user.id) {
    return;
  }

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) {
    return;
  }

  const existing = await prisma.userFollow.findUnique({
    where: {
      followerId_followingId: {
        followerId: session.user.id,
        followingId: targetId,
      },
    },
  });

  if (existing) {
    await prisma.userFollow.delete({ where: { id: existing.id } });
  } else {
    await prisma.userFollow.create({
      data: {
        followerId: session.user.id,
        followingId: targetId,
      },
    });
  }

  revalidatePath(`/u/${targetId}`);
  revalidatePath("/profile");
}
