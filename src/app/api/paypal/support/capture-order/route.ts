import { NextRequest, NextResponse } from "next/server";
import { capturePayPalVipOrder, getSuccessfulCapture } from "@/lib/paypal-vip";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`support-capture:${ip}`, 10, 10 * 60_000).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: { orderId?: unknown };
  try {
    body = (await req.json()) as { orderId?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (typeof body.orderId !== "string" || body.orderId.length < 6) {
    return NextResponse.json({ error: "invalid_order" }, { status: 400 });
  }

  let captureData;
  try {
    captureData = await capturePayPalVipOrder(body.orderId);
  } catch (error) {
    console.error("PayPal support capture failed", error);
    return NextResponse.json({ error: "paypal_capture_failed" }, { status: 502 });
  }

  const capture = getSuccessfulCapture(captureData);
  if (!capture) {
    return NextResponse.json({ error: "payment_not_completed" }, { status: 402 });
  }

  console.info("PayPal support payment captured", capture.id, capture.amount);
  return NextResponse.json({ ok: true, amount: capture.amount?.value ?? null });
}
