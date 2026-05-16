"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { isAtPinLimit } from "@/lib/signals/pin-signal-limit";

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

  const t = await getTranslations("errors");

  const parsed = commentSchema.safeParse({
    signalId: formData.get("signalId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { error: t("invalidData") };

  const { ok } = rateLimit(`sig-comment:${session.user.id}`, 10, 60_000);
  if (!ok) return { error: t("rateLimitComment") };

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

// --- Pin Signal ---

const pinSignalSchema = z.object({ signalId: z.string().min(1) });

export async function togglePinSignal(
  formData: FormData,
): Promise<{ ok: boolean; pinned?: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const userId = session.user.id;

  const rl = rateLimit(`sig-pin:${userId}`, 20, 60_000);
  if (!rl.ok) return { ok: false, error: "rateLimitOneMinute" };

  const parsed = pinSignalSchema.safeParse({ signalId: formData.get("signalId") });
  if (!parsed.success) return { ok: false, error: "invalidData" };
  const { signalId } = parsed.data;

  const signal = await prisma.signal.findUnique({ where: { id: signalId }, select: { id: true, authorId: true } });
  if (!signal) return { ok: false, error: "signalNotFound" };

  const existing = await prisma.userPinnedSignal.findUnique({
    where: { userId_signalId: { userId, signalId } },
  });

  if (existing) {
    await prisma.userPinnedSignal.delete({ where: { id: existing.id } });
    revalidatePath(`/u/${userId}`);
    return { ok: true, pinned: false };
  }

  const count = await prisma.userPinnedSignal.count({ where: { userId } });
  if (isAtPinLimit(count)) return { ok: false, error: "pinLimitReached" };

  try {
    await prisma.userPinnedSignal.create({
      data: { userId, signalId, sortOrder: count },
    });
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002") {
      return { ok: true, pinned: true };
    }
    throw e;
  }

  revalidatePath(`/u/${userId}`);
  return { ok: true, pinned: true };
}
