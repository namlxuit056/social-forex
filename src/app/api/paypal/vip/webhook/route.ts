import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCaptureOrderId,
  getPayPalWebhookId,
  getSuccessfulWebhookCapture,
  parsePayPalCustomId,
  type PayPalWebhookEvent,
  verifyPayPalWebhookSignature,
} from "@/lib/paypal-vip";
import { fulfillVipPayment } from "@/lib/vip-payment";

function getWebhookCustomId(event: PayPalWebhookEvent): string | undefined {
  return (
    event.resource?.custom_id ??
    event.resource?.purchase_units?.find((unit) => unit.custom_id)?.custom_id
  );
}

export async function POST(req: NextRequest) {
  if (!getPayPalWebhookId()) {
    return NextResponse.json(
      { error: "paypal_webhook_not_configured" },
      { status: 503 },
    );
  }

  let event: PayPalWebhookEvent;
  try {
    event = (await req.json()) as PayPalWebhookEvent;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const verified = await verifyPayPalWebhookSignature({
    headers: req.headers,
    event,
  });
  if (!verified) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  if (!event.id || !event.event_type) {
    return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  }

  const orderId = getCaptureOrderId(event);
  const webhookEvent = await prisma.vipWebhookEvent.upsert({
    where: { providerEventId: event.id },
    create: {
      providerEventId: event.id,
      eventType: event.event_type,
      providerOrderId: orderId,
      rawPayload: event,
    },
    update: {
      eventType: event.event_type,
      providerOrderId: orderId,
      rawPayload: event,
    },
    select: { processedAt: true },
  });

  if (webhookEvent.processedAt) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const capture = getSuccessfulWebhookCapture(event);
  if (!orderId || !capture) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const custom = parsePayPalCustomId(getWebhookCustomId(event));
  const amount = capture.amount ?? event.resource?.amount;
  const result = await fulfillVipPayment({
    providerOrderId: orderId,
    providerCaptureId: capture.id ?? event.resource?.id,
    userId: custom?.userId,
    planKey: custom?.plan,
    amount: amount?.value,
    currency: amount?.currency_code,
    source: "webhook",
    rawPayload: event,
  });

  await prisma.vipWebhookEvent.update({
    where: { providerEventId: event.id },
    data: { processedAt: new Date() },
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
