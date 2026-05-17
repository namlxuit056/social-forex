import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  addVipDays,
  capturePayPalVipOrder,
  getSuccessfulCapture,
} from "@/lib/paypal-vip";
import { getVipPlan } from "@/lib/vip-plans";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { orderId?: unknown; plan?: unknown };
  try {
    body = (await req.json()) as { orderId?: unknown; plan?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (typeof body.orderId !== "string" || body.orderId.length < 6) {
    return NextResponse.json({ error: "invalid_order" }, { status: 400 });
  }

  const plan = getVipPlan(body.plan);
  if (!plan) {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  }

  let captureData;
  try {
    captureData = await capturePayPalVipOrder(body.orderId);
  } catch {
    return NextResponse.json({ error: "paypal_capture_failed" }, { status: 502 });
  }

  const capture = getSuccessfulCapture(captureData);
  if (!capture) {
    return NextResponse.json({ error: "payment_not_completed" }, { status: 402 });
  }

  const amount = capture.amount;
  if (amount?.currency_code !== "USD" || amount.value !== plan.price) {
    return NextResponse.json({ error: "amount_mismatch" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { vipUntil: true },
  });
  const vipUntil = addVipDays(user?.vipUntil, plan.days);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.user.id },
      data: { vipUntil },
    }),
    prisma.vipAuditLog.create({
      data: {
        adminId: session.user.id,
        userId: session.user.id,
        action: "paypal_sandbox_capture",
        days: plan.days,
        vipUntil,
        note: `order=${body.orderId};capture=${capture.id ?? "unknown"};plan=${plan.key}`,
      },
    }),
  ]);

  revalidatePath("/upgrade-vip");
  revalidatePath("/profile");

  return NextResponse.json({
    ok: true,
    vipUntil: vipUntil.toISOString(),
  });
}
