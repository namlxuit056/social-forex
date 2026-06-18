import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://toolforex.xyz"
).replace(/\/$/, "");

async function sendReply(
  chatId: number | string,
  text: string,
  replyToMessageId?: number,
) {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
    }),
  });
}

async function getStats(from?: Date, to?: Date) {
  const signalDateFilter = from
    ? { closedAt: { gte: from, ...(to ? { lte: to } : {}) } }
    : { closedAt: { not: null as Date | null } };

  const journalDateFilter = from
    ? { closedAt: { gte: from, ...(to ? { lte: to } : {}) } }
    : { closedAt: { not: null as Date | null } };

  const [wins, losses, pnlData] = await Promise.all([
    prisma.signal.count({ where: { status: "CLOSED_WIN", ...signalDateFilter } }),
    prisma.signal.count({ where: { status: "CLOSED_LOSS", ...signalDateFilter } }),
    prisma.tradeJournal.aggregate({
      _sum: { pnl: true },
      where: {
        result: { in: ["WIN", "LOSS", "BREAKEVEN"] },
        ...journalDateFilter,
      },
    }),
  ]);

  const total = wins + losses;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : "0.0";
  return { wins, losses, total, winRate, pnl: pnlData._sum.pnl };
}

function buildMessage(
  title: string,
  stats: ReturnType<typeof getStats> extends Promise<infer T> ? T : never,
) {
  const lines = [`<b>${title}</b>`, ""];
  if (stats.total === 0) {
    lines.push("Chưa có lệnh nào trong khoảng thời gian này.");
    return lines.join("\n");
  }
  lines.push(`📈 Tổng lệnh đóng: <b>${stats.total}</b>`);
  lines.push(`✅ Thắng: <b>${stats.wins}</b> (${stats.winRate}%)`);
  lines.push(`❌ Thua: <b>${stats.losses}</b>`);
  if (typeof stats.pnl === "number") {
    const sign = stats.pnl >= 0 ? "+" : "";
    lines.push(`💰 Tổng PnL (MT5): <b>${sign}${stats.pnl.toFixed(2)}</b>`);
  }
  lines.push("", `🔗 ${SITE_URL}/vi/signals`);
  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  if (WEBHOOK_SECRET) {
    const token = req.headers.get("x-telegram-bot-api-secret-token");
    if (token !== WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: true });

  const message = body.message ?? body.channel_post;
  if (!message) return NextResponse.json({ ok: true });

  const text: string = message.text ?? "";
  const chatId: number | string = message.chat?.id;
  const messageId: number | undefined = message.message_id;

  if (!chatId || !text.startsWith("/")) return NextResponse.json({ ok: true });

  const command = text.split("@")[0].split(" ")[0].toLowerCase();
  const now = new Date();

  if (command === "/day") {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const dateStr = from.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const stats = await getStats(from, to);
    await sendReply(chatId, buildMessage(`📊 THỐNG KÊ HÔM NAY (${dateStr})`, stats), messageId);
  } else if (command === "/month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const monthStr = from.toLocaleDateString("vi-VN", {
      month: "2-digit",
      year: "numeric",
    });
    const stats = await getStats(from);
    await sendReply(chatId, buildMessage(`📊 THỐNG KÊ THÁNG ${monthStr}`, stats), messageId);
  } else if (command === "/all") {
    const stats = await getStats();
    await sendReply(chatId, buildMessage("📊 THỐNG KÊ TOÀN BỘ", stats), messageId);
  }

  return NextResponse.json({ ok: true });
}
