import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createPayPalVipOrder } from "@/lib/paypal-vip";
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
    return NextResponse.json({ id: order.id });
  } catch {
    return NextResponse.json({ error: "paypal_unavailable" }, { status: 502 });
  }
}
