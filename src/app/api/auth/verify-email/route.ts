import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { localeFromRequest } from "@/lib/api-locale";
import { hashEmailCode } from "@/lib/email-verification";
import { pickErrors } from "@/lib/messages-pick";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { addVipDays } from "@/lib/paypal-vip";

const REFERRER_REWARD_DAYS = 7;
const REFEREE_REWARD_DAYS = 3;

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

    if (user.referredById && !user.emailVerified) {
      try {
        const referrer = await prisma.user.findUnique({
          where: { id: user.referredById },
          select: { id: true, vipUntil: true },
        });
        if (referrer) {
          const existingEvent = await prisma.referralEvent.findUnique({
            where: { referrerId_refereeId: { referrerId: referrer.id, refereeId: user.id } },
          });
          if (!existingEvent) {
            const newReferrerVip = addVipDays(referrer.vipUntil, REFERRER_REWARD_DAYS);
            const newRefereeVip = addVipDays(user.vipUntil, REFEREE_REWARD_DAYS);
            await prisma.$transaction([
              prisma.user.update({
                where: { id: referrer.id },
                data: { vipUntil: newReferrerVip },
              }),
              prisma.user.update({
                where: { id: user.id },
                data: { vipUntil: newRefereeVip },
              }),
              prisma.referralEvent.create({
                data: {
                  referrerId: referrer.id,
                  refereeId: user.id,
                  rewardDays: REFERRER_REWARD_DAYS,
                },
              }),
            ]);
          }
        }
      } catch {
        // Non-blocking: VIP reward is best-effort
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: err.accountCreateFailed }, { status: 500 });
  }
}
