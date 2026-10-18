"use server";

import { randomBytes } from "node:crypto";
import { revalidateLocalizedPath } from "@/lib/revalidate-locales";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const copyTradeSchema = z.object({
  providerId: z.string().min(1),
  mode: z.enum(["LOT", "PERCENT", "RATIO"]),
  fixedLot: z.coerce.number().positive().optional(),
  riskPercent: z.coerce.number().min(0.1).max(10).optional(),
  lotPercent: z.coerce.number().min(1).max(500).optional(),
  xauusdLot: z.coerce.number().positive().optional(),
  btcusdLot: z.coerce.number().positive().optional(),
});

export async function subscribeCopyTrade(
  _prev: { error?: string; ok?: boolean; token?: string } | null,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean; token?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const t = await getTranslations("errors");
  const parsed = copyTradeSchema.safeParse({
    providerId: formData.get("providerId"),
    mode: formData.get("mode"),
    fixedLot: formData.get("fixedLot") ?? undefined,
    riskPercent: formData.get("riskPercent") ?? undefined,
    lotPercent: formData.get("lotPercent") ?? undefined,
    // Empty string means "clear the override", not "keep the current value" — map it
    // to undefined so a blank field results in null (fall back to fixedLot).
    xauusdLot: formData.get("xauusdLot") || undefined,
    btcusdLot: formData.get("btcusdLot") || undefined,
  });

  if (!parsed.success) return { error: t("invalidData") };

  const { providerId, mode, fixedLot, riskPercent, lotPercent, xauusdLot, btcusdLot } = parsed.data;
  const followerId = session.user.id;

  if (providerId === followerId) {
    return { error: "Cannot copy yourself" };
  }

  const { ok } = rateLimit(`copy-trade:${followerId}`, 10, 60_000);
  if (!ok) return { error: t("rateLimitOneMinute") };

  const provider = await prisma.user.findUnique({
    where: { id: providerId },
    select: { id: true },
  });
  if (!provider) return { error: "Provider not found" };

  if (mode === "LOT" && (!fixedLot || fixedLot <= 0)) {
    return { error: "Invalid lot size" };
  }
  if (mode === "PERCENT" && (!riskPercent || riskPercent <= 0 || riskPercent > 10)) {
    return { error: "Risk percent must be between 0.1% and 10%" };
  }
  if (mode === "RATIO" && (!lotPercent || lotPercent <= 0 || lotPercent > 500)) {
    return { error: "Lot percent must be between 1% and 500%" };
  }

  const existing = await prisma.copyTrade.findUnique({
    where: { followerId_providerId: { followerId, providerId } },
  });

  if (existing) {
    await prisma.copyTrade.update({
      where: { id: existing.id },
      data: {
        mode,
        fixedLot,
        riskPercent,
        lotPercent,
        xauusdLot: xauusdLot ?? null,
        btcusdLot: btcusdLot ?? null,
        isActive: true,
      },
    });
    revalidateLocalizedPath(`/u/${providerId}`);
    return { ok: true, token: existing.token };
  }

  const token = `ct_${randomBytes(24).toString("base64url")}`;

  await prisma.copyTrade.create({
    data: {
      followerId,
      providerId,
      token,
      mode,
      fixedLot,
      riskPercent,
      lotPercent,
      xauusdLot,
      btcusdLot,
    },
  });

  revalidateLocalizedPath(`/u/${providerId}`);
  return { ok: true, token };
}

export async function unsubscribeCopyTrade(providerId: string): Promise<{ ok?: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  await prisma.copyTrade.deleteMany({
    where: { followerId: session.user.id, providerId },
  });

  revalidateLocalizedPath(`/u/${providerId}`);
  return { ok: true };
}

const setCopierBlockedSchema = z.object({ copyTradeId: z.string().min(1), blocked: z.boolean() });

export async function setCopierBlocked(
  copyTradeId: string,
  blocked: boolean,
): Promise<{ error?: string; ok?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const parsed = setCopierBlockedSchema.safeParse({ copyTradeId, blocked });
  if (!parsed.success) return { error: "invalid_params" };

  const { ok } = rateLimit(`copy-trade-block:${session.user.id}`, 30, 60_000);
  if (!ok) return { error: "rate_limited" };

  const copyTrade = await prisma.copyTrade.findUnique({
    where: { id: parsed.data.copyTradeId },
    select: { providerId: true },
  });
  if (!copyTrade || copyTrade.providerId !== session.user.id) {
    return { error: "not_found" };
  }

  await prisma.copyTrade.update({
    where: { id: parsed.data.copyTradeId },
    data: { blockedByProvider: parsed.data.blocked },
  });

  revalidateLocalizedPath(`/u/${session.user.id}`);
  return { ok: true };
}

const providerReviewSchema = z.object({
  providerId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

const REVIEW_ELIGIBILITY_DAYS = 7;

export async function submitProviderReview(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const t = await getTranslations("errors");
  const parsed = providerReviewSchema.safeParse({
    providerId: formData.get("providerId"),
    rating: formData.get("rating"),
    comment: formData.get("comment") || undefined,
  });
  if (!parsed.success) return { error: t("invalidData") };

  const { providerId, rating, comment } = parsed.data;
  const reviewerId = session.user.id;
  if (providerId === reviewerId) {
    return { error: "Cannot review yourself" };
  }

  const { ok } = rateLimit(`provider-review:${reviewerId}`, 10, 60_000);
  if (!ok) return { error: t("rateLimitOneMinute") };

  const eligibleSince = new Date(Date.now() - REVIEW_ELIGIBILITY_DAYS * 86_400_000);
  const eligibleCopyTrade = await prisma.copyTrade.findFirst({
    where: { followerId: reviewerId, providerId, createdAt: { lte: eligibleSince } },
    select: { id: true },
  });
  if (!eligibleCopyTrade) {
    return { error: t("reviewNotEligible") };
  }

  await prisma.copyTradeReview.upsert({
    where: { reviewerId_providerId: { reviewerId, providerId } },
    update: { rating, comment: comment || null },
    create: { reviewerId, providerId, rating, comment: comment || null },
  });

  revalidateLocalizedPath(`/u/${providerId}`);
  return { ok: true };
}

const setCopyTradingPausedSchema = z.object({ paused: z.boolean() });

export async function setCopyTradingPaused(paused: boolean): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const parsed = setCopyTradingPausedSchema.safeParse({ paused });
  if (!parsed.success) return { error: "invalid_params" };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { copyTradingPaused: parsed.data.paused },
  });

  revalidateLocalizedPath("/positions");
  return {};
}
