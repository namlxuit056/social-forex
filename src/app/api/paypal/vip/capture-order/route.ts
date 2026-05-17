import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  capturePayPalVipOrder,
  getSuccessfulCapture,
} from "@/lib/paypal-vip";
import { fulfillVipPayment } from "@/lib/vip-payment";
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
  } catch (error) {
    console.error("PayPal VIP capture failed", error);
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

  const result = await fulfillVipPayment({
    providerOrderId: body.orderId,
    providerCaptureId: capture.id,
    userId: session.user.id,
    planKey: plan.key,
    amount: amount.value,
    currency: amount.currency_code,
    source: "capture",
    rawPayload: captureData,
  });

  revalidatePath("/upgrade-vip");
  revalidatePath("/profile");

  return NextResponse.json({
    ok: true,
    fulfilled: result.fulfilled,
    alreadyFulfilled: result.alreadyFulfilled,
    vipUntil: result.vipUntil.toISOString(),
  });
}
