import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { localeFromRequest } from "@/lib/api-locale";
import {
  emailCodeExpiresAt,
  generateEmailCode,
  hashEmailCode,
  sendVerificationCode,
} from "@/lib/email-verification";
import { pickErrors } from "@/lib/messages-pick";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

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
    const normalizedEmail = email.toLowerCase();
    const limited = rateLimit(`register:${normalizedEmail}`, 3, 10 * 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: err.rateLimitOneMinute },
        { status: 429 },
      );
    }
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing?.emailVerified) {
      return NextResponse.json({ error: err.emailTaken }, { status: 409 });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const code = generateEmailCode();
    const token = hashEmailCode(normalizedEmail, code);
    const expires = emailCodeExpiresAt();

    await prisma.$transaction([
      existing
        ? prisma.user.update({
            where: { id: existing.id },
            data: { name, passwordHash },
          })
        : prisma.user.create({
            data: {
              name,
              email: normalizedEmail,
              passwordHash,
            },
          }),
      prisma.verificationToken.deleteMany({
        where: { identifier: normalizedEmail },
      }),
      prisma.verificationToken.create({
        data: {
          identifier: normalizedEmail,
          token,
          expires,
        },
      }),
    ]);

    await sendVerificationCode({
      email: normalizedEmail,
      code,
      locale: loc,
    });

    return NextResponse.json({ ok: true, requiresVerification: true });
  } catch {
    return NextResponse.json({ error: err.accountCreateFailed }, { status: 500 });
  }
}
