import { NextRequest, NextResponse } from "next/server";
import { createPayPalSupportOrder } from "@/lib/paypal-vip";
import { clientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { parseSupportAmount } from "@/lib/support-amount";

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  if (!rateLimit(`support-order:${ip}`, 10, 10 * 60_000).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: { amount?: unknown };
  try {
    body = (await req.json()) as { amount?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const amount = parseSupportAmount(body.amount);
  if (!amount) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }

  try {
    const order = await createPayPalSupportOrder(amount);
    return NextResponse.json({ id: order.id });
  } catch (error) {
    console.error("PayPal support create order failed", error);
    return NextResponse.json({ error: "paypal_unavailable" }, { status: 502 });
  }
}
