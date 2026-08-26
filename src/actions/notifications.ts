"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { revalidateNotificationSurfaces } from "@/lib/revalidate-notification-surfaces";
import { revalidateLocalizedPath } from "@/lib/revalidate-locales";

export async function markNotificationRead(notificationId: string) {
  const session = await auth();
  if (!session?.user?.id) return;
  await prisma.notification.updateMany({
    where: { id: notificationId, userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidateNotificationSurfaces();
}

export async function markAllNotificationsRead() {
  const session = await auth();
  if (!session?.user?.id) return;
  await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidateNotificationSurfaces();
}

export async function updateNotificationSettings(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { vipUntil: true },
  });
  const vip = isVipActive(user?.vipUntil);

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      notifySignalFollow: formData.get("notifySignalFollow") === "on",
      notifySignalFavoriteSym: formData.get("notifySignalFavoriteSym") === "on",
      ...(vip
        ? {
            notifySignalVipBroadcast:
              formData.get("notifySignalVipBroadcast") === "on",
          }
        : {}),
    },
  });

  revalidateLocalizedPath("/profile", "page");
}
