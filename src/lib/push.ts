import webPush from "web-push";
import { prisma } from "@/lib/prisma";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_EMAIL = process.env.VAPID_EMAIL ?? "mailto:admin@socialforex.com";

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error("VAPID keys not configured");
  }
  webPush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  vapidConfigured = true;
}

export function isPushEnabled(): boolean {
  return !!VAPID_PUBLIC_KEY && !!VAPID_PRIVATE_KEY;
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

export async function subscribePush(
  userId: string,
  subscription: { endpoint: string; p256dh: string; auth: string },
): Promise<void> {
  ensureVapid();
  await prisma.userPushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
    update: { p256dh: subscription.p256dh, auth: subscription.auth },
  });
}

export async function unsubscribePush(endpoint: string): Promise<void> {
  await prisma.userPushSubscription.deleteMany({ where: { endpoint } });
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string },
): Promise<void> {
  ensureVapid();
  const subs = await prisma.userPushSubscription.findMany({
    where: { userId },
  });

  for (const sub of subs) {
    try {
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
      );
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await prisma.userPushSubscription.delete({ where: { id: sub.id } });
      }
    }
  }
}

export async function sendPushToFollowers(
  authorId: string,
  payload: { title: string; body: string; url?: string },
): Promise<void> {
  ensureVapid();
  const followers = await prisma.userFollow.findMany({
    where: { followingId: authorId },
    select: { followerId: true },
  });

  for (const f of followers) {
    await sendPushToUser(f.followerId, payload);
  }
}
