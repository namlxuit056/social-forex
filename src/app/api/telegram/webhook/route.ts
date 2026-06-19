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

type Mt5Position = {
  ticket?: string | number;
  symbol?: string;
  type?: string;
  volume?: number;
  priceOpen?: number;
  priceCurrent?: number;
  stopLoss?: number;
  takeProfit?: number;
  profit?: number;
  swap?: number;
  openedAt?: string;
};

async function buildRunMessage(): Promise<string> {
  const staleThreshold = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes

  const connections = await prisma.mt5Connection.findMany({
    where: {
      revokedAt: null,
      lastSnapshotAt: { gte: staleThreshold },
      openPositions: { gt: 0 },
    },
    select: {
      name: true,
      accountName: true,
      accountCurrency: true,
      equity: true,
      lastPositions: true,
      lastSnapshotAt: true,
    },
    orderBy: { lastSnapshotAt: "desc" },
    take: 10,
  });

  if (connections.length === 0) {
    return "<b>📊 LỆNH ĐANG CHẠY</b>\n\nKhông có lệnh nào đang mở hoặc MT5 offline.";
  }

  const lines: string[] = ["<b>📊 LỆNH ĐANG CHẠY</b>", ""];
  let grandTotal = 0;
  let totalPositions = 0;

  for (const conn of connections) {
    const positions = Array.isArray(conn.lastPositions)
      ? (conn.lastPositions as Mt5Position[])
      : [];
    if (positions.length === 0) continue;

    const label = conn.accountName ?? conn.name;
    const currency = conn.accountCurrency ?? "USD";
    const equity = conn.equity !== null ? `  Equity: ${conn.equity.toFixed(2)} ${currency}` : "";
    lines.push(`<b>📌 ${label}</b>${equity}`);

    let connTotal = 0;
    for (const pos of positions) {
      const symbol = pos.symbol ?? "—";
      const type = pos.type ?? "—";
      const vol = pos.volume !== undefined ? pos.volume.toFixed(2) : "—";
      const open = pos.priceOpen !== undefined ? pos.priceOpen : null;
      const current = pos.priceCurrent !== undefined ? pos.priceCurrent : null;
      const sl = pos.stopLoss ?? 0;
      const tp = pos.takeProfit ?? 0;
      const profit = pos.profit ?? 0;
      const swap = pos.swap ?? 0;
      const net = profit + swap;

      const emoji = type === "BUY" ? "🟢" : type === "SELL" ? "🔴" : "⚪️";
      const profitSign = net >= 0 ? "+" : "";
      const priceStr =
        open !== null && current !== null
          ? `${open} → ${current}`
          : open !== null
          ? `${open}`
          : "—";
      const slTpStr = [sl !== 0 ? `SL ${sl}` : null, tp !== 0 ? `TP ${tp}` : null]
        .filter(Boolean)
        .join(" | ");

      lines.push(`${emoji} <b>${type} ${symbol}</b>  ${vol} lot`);
      lines.push(`   ${priceStr}   P&L: <b>${profitSign}${net.toFixed(2)}</b>`);
      if (slTpStr) lines.push(`   ${slTpStr}`);

      connTotal += net;
      totalPositions++;
    }
    grandTotal += connTotal;

    const connSign = connTotal >= 0 ? "+" : "";
    lines.push(`   <i>Subtotal: ${connSign}${connTotal.toFixed(2)} ${currency}</i>`);
    lines.push("");
  }

  const sign = grandTotal >= 0 ? "+" : "";
  lines.push(`━━━━━━━━━━━━━━━━`);
  lines.push(`💰 Tổng P&L đang mở: <b>${sign}${grandTotal.toFixed(2)}</b>  (${totalPositions} lệnh)`);
  lines.push(`🕐 ${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`);

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
  } else if (command === "/run") {
    const msg = await buildRunMessage();
    await sendReply(chatId, msg, messageId);
  }

  return NextResponse.json({ ok: true });
}
