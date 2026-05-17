import { VipPaymentStatus } from "@/generated/prisma/enums";
import type { InputJsonValue } from "@/generated/prisma/internal/prismaNamespace";
import { prisma } from "@/lib/prisma";
import { addVipDays, isPayPalLive } from "@/lib/paypal-vip";
import { getVipPlan, type VipPlanKey } from "@/lib/vip-plans";

type FulfillVipPaymentInput = {
  providerOrderId: string;
  providerCaptureId?: string | null;
  userId?: string | null;
  planKey?: string | null;
  amount?: string | null;
  currency?: string | null;
  source: "capture" | "webhook";
  rawPayload?: unknown;
};

export type FulfillVipPaymentResult = {
  ok: true;
  fulfilled: boolean;
  alreadyFulfilled: boolean;
  vipUntil: Date;
};

function toJson(value: unknown): InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as InputJsonValue;
}

function assertVipPlan(planKey: string | null | undefined) {
  const plan = getVipPlan(planKey);
  if (!plan) {
    throw new Error("Invalid VIP payment plan.");
  }
  return plan;
}

function assertPaymentAmount({
  amount,
  currency,
  expectedAmount,
}: {
  amount: string | null | undefined;
  currency: string | null | undefined;
  expectedAmount: string;
}) {
  if (amount && amount !== expectedAmount) {
    throw new Error("VIP payment amount mismatch.");
  }
  if (currency && currency !== "USD") {
    throw new Error("VIP payment currency mismatch.");
  }
}

export async function recordCreatedVipPayment({
  providerOrderId,
  userId,
  planKey,
}: {
  providerOrderId: string;
  userId: string;
  planKey: VipPlanKey;
}) {
  const plan = assertVipPlan(planKey);
  return prisma.vipPayment.upsert({
    where: { providerOrderId },
    create: {
      providerOrderId,
      userId,
      planKey: plan.key,
      amount: plan.price,
      currency: "USD",
      status: VipPaymentStatus.CREATED,
    },
    update: {
      userId,
      planKey: plan.key,
      amount: plan.price,
      currency: "USD",
    },
    select: { id: true },
  });
}

export async function fulfillVipPayment(
  input: FulfillVipPaymentInput,
): Promise<FulfillVipPaymentResult> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.vipPayment.findUnique({
      where: { providerOrderId: input.providerOrderId },
      select: {
        id: true,
        userId: true,
        planKey: true,
        amount: true,
        currency: true,
        vipUntil: true,
        fulfilledAt: true,
      },
    });

    const userId = existing?.userId ?? input.userId;
    if (!userId) {
      throw new Error("VIP payment is missing a user.");
    }

    const plan = assertVipPlan(existing?.planKey ?? input.planKey);
    assertPaymentAmount({
      amount: input.amount ?? existing?.amount,
      currency: input.currency ?? existing?.currency,
      expectedAmount: plan.price,
    });

    if (existing?.fulfilledAt && existing.vipUntil) {
      return {
        ok: true,
        fulfilled: false,
        alreadyFulfilled: true,
        vipUntil: existing.vipUntil,
      };
    }

    const payment = await tx.vipPayment.upsert({
      where: { providerOrderId: input.providerOrderId },
      create: {
        providerOrderId: input.providerOrderId,
        providerCaptureId: input.providerCaptureId,
        userId,
        planKey: plan.key,
        amount: plan.price,
        currency: "USD",
        status: VipPaymentStatus.CREATED,
        rawPayload: toJson(input.rawPayload),
      },
      update: {
        providerCaptureId: input.providerCaptureId ?? undefined,
        rawPayload: toJson(input.rawPayload),
      },
      select: { id: true, vipUntil: true, fulfilledAt: true },
    });

    if (payment.fulfilledAt && payment.vipUntil) {
      return {
        ok: true,
        fulfilled: false,
        alreadyFulfilled: true,
        vipUntil: payment.vipUntil,
      };
    }

    const claimed = await tx.vipPayment.updateMany({
      where: { id: payment.id, fulfilledAt: null },
      data: {
        status: VipPaymentStatus.CAPTURED,
        providerCaptureId: input.providerCaptureId ?? undefined,
      },
    });

    if (claimed.count === 0) {
      const fulfilled = await tx.vipPayment.findUniqueOrThrow({
        where: { id: payment.id },
        select: { vipUntil: true },
      });
      if (!fulfilled.vipUntil) {
        throw new Error("VIP payment was claimed but has no VIP expiry.");
      }
      return {
        ok: true,
        fulfilled: false,
        alreadyFulfilled: true,
        vipUntil: fulfilled.vipUntil,
      };
    }

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { vipUntil: true },
    });
    if (!user) {
      throw new Error("VIP payment user was not found.");
    }

    const vipUntil = addVipDays(user.vipUntil, plan.days);
    await tx.user.update({
      where: { id: userId },
      data: { vipUntil },
    });
    await tx.vipPayment.update({
      where: { id: payment.id },
      data: {
        status: VipPaymentStatus.FULFILLED,
        vipUntil,
        fulfilledAt: new Date(),
      },
    });
    await tx.vipAuditLog.create({
      data: {
        adminId: userId,
        userId,
        action: `${isPayPalLive() ? "paypal_live" : "paypal_sandbox"}_${input.source}`,
        days: plan.days,
        vipUntil,
        note: `order=${input.providerOrderId};capture=${input.providerCaptureId ?? "unknown"};plan=${plan.key}`,
      },
    });

    return {
      ok: true,
      fulfilled: true,
      alreadyFulfilled: false,
      vipUntil,
    };
  });
}
