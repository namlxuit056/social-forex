import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  secret: z.string().min(8),
  email: z.string().email(),
  days: z.coerce.number().int().min(1).max(3650).optional().default(30),
});

/**
 * Kích hoạt VIP theo email (bảo vệ bằng ADMIN_SECRET).
 * POST /api/admin/vip  { "secret": "...", "email": "...", "days": 30 }
 */
export async function POST(request: Request) {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return NextResponse.json(
      { error: "ADMIN_SECRET chưa cấu hình trên server." },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { secret, email, days } = parsed.data;
  if (secret !== adminSecret) {
    return NextResponse.json({ error: "invalid secret" }, { status: 401 });
  }

  const vipUntil = new Date();
  vipUntil.setDate(vipUntil.getDate() + days);

  let user;
  try {
    user = await prisma.user.update({
      where: { email },
      data: { vipUntil },
      select: { id: true, email: true, vipUntil: true },
    });
  } catch {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, user });
}
