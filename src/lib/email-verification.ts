import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { getSiteUrl } from "@/lib/site-url";

const CODE_TTL_MINUTES = 10;

export function generateEmailCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

export function emailCodeExpiresAt() {
  return new Date(Date.now() + CODE_TTL_MINUTES * 60_000);
}

export function hashEmailCode(email: string, code: string) {
  const secret = process.env.AUTH_SECRET ?? "dev-secret";
  return crypto
    .createHash("sha256")
    .update(`${email.toLowerCase()}:${code}:${secret}`)
    .digest("hex");
}

function smtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.EMAIL_FROM,
  );
}

export async function sendVerificationCode({
  email,
  code,
  locale,
}: {
  email: string;
  code: string;
  locale: string;
}) {
  const isVi = locale === "vi";
  const subject = isVi
    ? "Mã xác minh Social Forex"
    : "Your Social Forex verification code";
  const text = isVi
    ? `Mã xác minh Social Forex của bạn là ${code}. Mã hết hạn sau ${CODE_TTL_MINUTES} phút.\n\nNếu bạn không tạo tài khoản, hãy bỏ qua email này.\n\n${getSiteUrl()}`
    : `Your Social Forex verification code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes.\n\nIf you did not create an account, ignore this email.\n\n${getSiteUrl()}`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <h1 style="font-size:20px;margin:0 0 12px">Social Forex</h1>
      <p>${isVi ? "Mã xác minh của bạn là:" : "Your verification code is:"}</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:16px 0">${code}</p>
      <p>${isVi ? `Mã hết hạn sau ${CODE_TTL_MINUTES} phút.` : `This code expires in ${CODE_TTL_MINUTES} minutes.`}</p>
      <p style="color:#6b7280;font-size:13px">${isVi ? "Nếu bạn không tạo tài khoản, hãy bỏ qua email này." : "If you did not create an account, ignore this email."}</p>
    </div>
  `;

  if (!smtpConfigured()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP is not configured");
    }
    console.info(`[email-verification] ${email}: ${code}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject,
    text,
    html,
  });
}
