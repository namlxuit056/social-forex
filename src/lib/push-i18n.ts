import { createTranslator } from "next-intl";
import { prisma } from "@/lib/prisma";
import { isPushEnabled, sendPushToUser } from "@/lib/push";
import viMessages from "../../messages/vi.json";
import enMessages from "../../messages/en.json";

/**
 * Push notification theo ngôn ngữ user đã chọn (User.locale, default vi).
 * Dùng createTranslator thay vì getTranslations vì các sender chạy trong
 * cron/API route không có request locale context.
 */

export type PushTranslator = ReturnType<typeof pushTranslator>;

export function pushTranslator(locale: string | null | undefined) {
  const resolved = locale === "en" ? "en" : "vi";
  return createTranslator({
    locale: resolved,
    messages: resolved === "en" ? enMessages : viMessages,
    namespace: "push",
  });
}

type PushPayload = { title: string; body: string; url?: string };

export async function sendLocalizedPushToUser(
  userId: string,
  build: (t: PushTranslator) => PushPayload,
): Promise<void> {
  if (!isPushEnabled()) return;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { locale: true },
  });
  await sendPushToUser(userId, build(pushTranslator(user?.locale)));
}

/** Gửi cho followers, mỗi người theo ngôn ngữ của chính họ. */
export async function sendLocalizedPushToFollowers(
  authorId: string,
  build: (t: PushTranslator) => PushPayload,
): Promise<void> {
  if (!isPushEnabled()) return;
  const followers = await prisma.userFollow.findMany({
    where: { followingId: authorId },
    select: { followerId: true, follower: { select: { locale: true } } },
  });
  for (const f of followers) {
    await sendPushToUser(f.followerId, build(pushTranslator(f.follower.locale)));
  }
}
