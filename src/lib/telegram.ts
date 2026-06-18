const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? "@toolforex";
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://toolforex.xyz"
).replace(/\/$/, "");

async function send(text: string): Promise<void> {
  if (!BOT_TOKEN) return;
  const res = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "HTML" }),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Telegram API ${res.status}: ${body}`);
  }
}

export async function notifyTelegramNewSignal(signal: {
  id: string;
  symbol: string;
  direction: string;
  entry: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
  takeProfit2?: number | null;
  takeProfit3?: number | null;
  tier: string;
}): Promise<void> {
  if (!BOT_TOKEN) return;
  const dir = signal.direction === "LONG" ? "BUY 📈" : "SELL 📉";
  const tier = signal.tier === "VIP" ? " 💎 VIP" : "";
  const lines = [
    `🔔 <b>TIN HIEU MOI${tier}</b>`,
    "",
    `📌 <b>${signal.symbol}</b> | ${dir}`,
    `💰 Entry: <b>${signal.entry}</b>`,
  ];
  if (signal.takeProfit) lines.push(`🎯 TP1: ${signal.takeProfit}`);
  if (signal.takeProfit2) lines.push(`🎯 TP2: ${signal.takeProfit2}`);
  if (signal.takeProfit3) lines.push(`🎯 TP3: ${signal.takeProfit3}`);
  if (signal.stopLoss) lines.push(`🛑 SL: ${signal.stopLoss}`);
  lines.push("", `🔗 ${SITE_URL}/vi/signals/${signal.id}`);
  try {
    await send(lines.join("\n"));
  } catch {
    // Non-blocking
  }
}

export async function notifyTelegramClosedSignal(signal: {
  id: string;
  symbol: string;
  direction: string;
  status: "CLOSED_WIN" | "CLOSED_LOSS" | "CANCELLED";
  profit?: number | null;
}): Promise<void> {
  if (!BOT_TOKEN) return;
  if (signal.status === "CANCELLED") return;
  const isWin = signal.status === "CLOSED_WIN";
  const icon = isWin ? "✅" : "❌";
  const label = isWin ? "CHOT LOI (TP HIT)" : "DUNG LO (SL HIT)";
  const dir = signal.direction === "LONG" ? "BUY" : "SELL";
  const lines = [
    `${icon} <b>${label}</b>`,
    "",
    `📌 <b>${signal.symbol}</b> | ${dir}`,
  ];
  if (typeof signal.profit === "number") {
    const sign = signal.profit >= 0 ? "+" : "";
    lines.push(`💵 PnL: <b>${sign}${signal.profit.toFixed(2)}</b>`);
  }
  lines.push("", `🔗 ${SITE_URL}/vi/signals/${signal.id}`);
  try {
    await send(lines.join("\n"));
  } catch {
    // Non-blocking
  }
}
