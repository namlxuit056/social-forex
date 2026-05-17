import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createPayPalVipOrder } from "@/lib/paypal-vip";
import { recordCreatedVipPayment } from "@/lib/vip-payment";
import { getVipPlan } from "@/lib/vip-plans";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { plan?: unknown };
  try {
    body = (await req.json()) as { plan?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const plan = getVipPlan(body.plan);
  if (!plan) {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  });

  try {
    const order = await createPayPalVipOrder({
      plan,
      userId: session.user.id,
      userEmail: user?.email,
    });
    await recordCreatedVipPayment({
      providerOrderId: order.id,
      userId: session.user.id,
      planKey: plan.key,
    });
    return NextResponse.json({ id: order.id });
  } catch (error) {
    console.error("PayPal VIP create order failed", error);
    return NextResponse.json({ error: "paypal_unavailable" }, { status: 502 });
  }
}
