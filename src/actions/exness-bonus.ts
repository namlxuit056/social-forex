"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { rateLimit } from "@/lib/rate-limit";
import { revalidateLocalizedPath } from "@/lib/revalidate-locales";
import {
  EXNESS_BONUS_AMOUNT_USD,
  EXNESS_BONUS_PAYOUT_METHODS,
  isEligibleExnessBridge,
  isExnessDemoServer,
} from "@/lib/exness-bonus";

/** `error` là key trong namespace i18n `exnessBonus.errors`. */
export type ExnessBonusState = { error: string } | { ok: true } | null;

const claimSchema = z.object({
  connectionId: z.string().min(1),
  payoutMethod: z.enum(EXNESS_BONUS_PAYOUT_METHODS),
  payoutDetails: z.string().trim().min(4).max(300),
  userNote: z.string().trim().max(500).optional(),
});

export async function submitExnessBonusClaim(
  _prev: ExnessBonusState,
  formData: FormData,
): Promise<ExnessBonusState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/exness-bonus");
  const userId = session.user.id;

  if (!rateLimit(`exness-bonus:${userId}`, 5, 60 * 60 * 1000).ok) {
    return { error: "rateLimited" };
  }

  const parsed = claimSchema.safeParse({
    connectionId: formData.get("connectionId"),
    payoutMethod: formData.get("payoutMethod"),
    payoutDetails: formData.get("payoutDetails"),
    userNote: formData.get("userNote") || undefined,
  });
  if (!parsed.success) return { error: "invalid" };

  const conn = await prisma.mt5Connection.findFirst({
    where: { id: parsed.data.connectionId, userId },
    select: {
      id: true,
      revokedAt: true,
      lastSeenAt: true,
      accountLogin: true,
      accountServer: true,
      accountCompany: true,
    },
  });
  if (!conn || !isEligibleExnessBridge(conn)) return { error: "notEligible" };
  if (isExnessDemoServer(conn.accountServer)) return { error: "demoAccount" };

  const existing = await prisma.exnessBonusClaim.findUnique({
    where: { userId },
    select: { status: true },
  });
  if (existing && existing.status !== "REJECTED") return { error: "alreadyClaimed" };

  const data = {
    mt5ConnectionId: conn.id,
    accountLogin: conn.accountLogin!,
    accountServer: conn.accountServer,
    accountCompany: conn.accountCompany,
    amountUsd: EXNESS_BONUS_AMOUNT_USD,
    payoutMethod: parsed.data.payoutMethod,
    payoutDetails: parsed.data.payoutDetails,
    userNote: parsed.data.userNote ?? null,
  };

  try {
    await prisma.exnessBonusClaim.upsert({
      where: { userId },
      create: { userId, ...data },
      update: {
        ...data,
        status: "PENDING",
        adminNote: null,
        reviewedById: null,
        reviewedAt: null,
        paidAt: null,
      },
    });
  } catch (e) {
    // Cùng số tài khoản đã được user khác dùng để nhận thưởng
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "accountTaken" };
    }
    throw e;
  }

  revalidateLocalizedPath("/exness-bonus");
  revalidateLocalizedPath("/admin/exness-bonus");
  return { ok: true };
}

const reviewSchema = z.object({
  claimId: z.string().min(1),
  status: z.enum(["APPROVED", "PAID", "REJECTED"]),
  adminNote: z.string().trim().max(500).optional(),
});

export async function reviewExnessBonusClaim(
  _prev: ExnessBonusState,
  formData: FormData,
): Promise<ExnessBonusState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (admin?.role !== "ADMIN") return { error: "forbidden" };

  const parsed = reviewSchema.safeParse({
    claimId: formData.get("claimId"),
    status: formData.get("status"),
    adminNote: formData.get("adminNote") || undefined,
  });
  if (!parsed.success) return { error: "invalid" };

  const now = new Date();
  const { status, adminNote } = parsed.data;
  const updated = await prisma.exnessBonusClaim
    .update({
      where: { id: parsed.data.claimId },
      data: {
        status,
        ...(adminNote !== undefined ? { adminNote } : {}),
        reviewedById: session.user.id,
        reviewedAt: now,
        paidAt: status === "PAID" ? now : null,
      },
    })
    .catch(() => null);
  if (!updated) return { error: "notFound" };

  // TODO: gửi Notification cho user khi PAID/REJECTED (cần thêm NotificationKind + render trong notification list)
  revalidateLocalizedPath("/admin/exness-bonus");
  revalidateLocalizedPath("/exness-bonus");
  return { ok: true };
}
