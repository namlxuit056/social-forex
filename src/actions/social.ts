"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidateNotificationSurfaces } from "@/lib/revalidate-notification-surfaces";
import { routing } from "@/i18n/routing";

const FOLLOW_DEDUPE_PREFIX = "f:";

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

  const dedupeKey = `${FOLLOW_DEDUPE_PREFIX}${session.user.id}`;

  if (existing) {
    await prisma.userFollow.delete({ where: { id: existing.id } });
    await prisma.notification.deleteMany({
      where: {
        userId: targetId,
        dedupeKey,
        kind: "USER_FOLLOWED",
      },
    });
  } else {
    await prisma.userFollow.create({
      data: {
        followerId: session.user.id,
        followingId: targetId,
      },
    });
    await prisma.notification.create({
      data: {
        userId: targetId,
        kind: "USER_FOLLOWED",
        dedupeKey,
        actorUserId: session.user.id,
        signalId: null,
      },
    });
  }

  revalidatePath(`/u/${targetId}`);
  revalidatePath("/profile");
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/signals`, "page");
  }
  revalidateNotificationSurfaces();
}
