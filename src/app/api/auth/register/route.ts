import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { localeFromRequest } from "@/lib/api-locale";
import { pickErrors } from "@/lib/messages-pick";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  name: z.string().min(2).max(64),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(request: NextRequest) {
  const loc = localeFromRequest(request);
  const err = pickErrors(loc);

  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: err.invalidData, details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { name, email, password } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: err.emailTaken }, { status: 409 });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: err.accountCreateFailed }, { status: 500 });
  }
}
