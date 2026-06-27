import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { Prisma } from "@/generated/prisma/client";

export const runtime = "nodejs";

// GET — list user's alert rules
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const alerts = await prisma.screenerAlert.findMany({
    where: { userId: session.user.id },
    include: {
      logs: {
        orderBy: { triggeredAt: "desc" },
        take: 20,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(alerts);
}

// POST — create new alert rule
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { ok } = rateLimit(`screener-alert-create:${userId}`, 10, 60_000);
  if (!ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await req.json();
  const { name, conditions } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }

  if (!conditions || typeof conditions !== "object") {
    return NextResponse.json({ error: "conditions_required" }, { status: 400 });
  }

  // Limit: max 20 active alerts per user
  const activeCount = await prisma.screenerAlert.count({
    where: { userId, isActive: true },
  });
  if (activeCount >= 20) {
    return NextResponse.json({ error: "max_alerts_reached" }, { status: 400 });
  }

  const alert = await prisma.screenerAlert.create({
    data: {
      userId,
      name: name.trim(),
      conditions: conditions as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json(alert, { status: 201 });
}

// PATCH — update alert (toggle active, edit name/conditions)
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await req.json();
  const { id, name, conditions, isActive } = body;

  if (!id) {
    return NextResponse.json({ error: "id_required" }, { status: 400 });
  }

  // Verify ownership
  const existing = await prisma.screenerAlert.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (typeof name === "string") updateData.name = name.trim();
  if (conditions && typeof conditions === "object")
    updateData.conditions = conditions;
  if (typeof isActive === "boolean") updateData.isActive = isActive;

  const alert = await prisma.screenerAlert.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(alert);
}

// DELETE — delete alert rule
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id_required" }, { status: 400 });
  }

  // Verify ownership
  const existing = await prisma.screenerAlert.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await prisma.screenerAlert.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
