import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { localeFromRequest } from "@/lib/api-locale";
import { hashEmailCode } from "@/lib/email-verification";
import { pickErrors } from "@/lib/messages-pick";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(request: NextRequest) {
  const loc = localeFromRequest(request);
  const err = pickErrors(loc);

  try {
    const body = await request.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: err.invalidVerificationCode }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const code = parsed.data.code;
    const limited = rateLimit(`verify-email:${email}`, 5, 10 * 60_000);
    if (!limited.ok) {
      return NextResponse.json({ error: err.rateLimitOneMinute }, { status: 429 });
    }

    const token = hashEmailCode(email, code);
    const verification = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verification || verification.identifier !== email) {
      return NextResponse.json({ error: err.invalidVerificationCode }, { status: 400 });
    }

    if (verification.expires < new Date()) {
      await prisma.verificationToken.deleteMany({ where: { identifier: email } });
      return NextResponse.json({ error: err.verificationCodeExpired }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: err.accountCreateFailed }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      }),
      prisma.verificationToken.deleteMany({ where: { identifier: email } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: err.accountCreateFailed }, { status: 500 });
  }
}
