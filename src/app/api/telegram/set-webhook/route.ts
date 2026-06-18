import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://toolforex.xyz"
).replace(/\/$/, "");
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!BOT_TOKEN) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN not configured" },
      { status: 400 },
    );
  }

  const webhookUrl = `${SITE_URL}/api/telegram/webhook`;
  const res = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        ...(WEBHOOK_SECRET ? { secret_token: WEBHOOK_SECRET } : {}),
        allowed_updates: ["message", "channel_post"],
      }),
    },
  );

  const data = await res.json();
  return NextResponse.json({ webhookUrl, telegram: data });
}
