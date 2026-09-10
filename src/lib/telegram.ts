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

// Allowlist gate — only signals authored by a user in TelegramSignalBroadcaster
// are pushed to the channel. An empty allowlist means "broadcast everything", so
// this feature is inert until an admin adds the first user at /admin/telegram-signals.
const BROADCASTER_CACHE_TTL_MS = 60 * 1000;
let cachedBroadcasters: { ids: Set<string>; at: number } | null = null;

/** Call after writing TelegramSignalBroadcaster so this instance sees the change now. */
export function invalidateTelegramBroadcasterCache(): void {
  cachedBroadcasters = null;
}

async function getBroadcasterIds(): Promise<Set<string>> {
  if (
    cachedBroadcasters &&
    Date.now() - cachedBroadcasters.at < BROADCASTER_CACHE_TTL_MS
  ) {
    return cachedBroadcasters.ids;
  }
  try {
    // Lazy import keeps this module load-time side-effect-free (Prisma throws when
    // DATABASE_URL is unset, e.g. in unit tests that never touch Telegram).
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.telegramSignalBroadcaster.findMany({
      select: { userId: true },
    });
    cachedBroadcasters = { ids: new Set(rows.map((r) => r.userId)), at: Date.now() };
  } catch {
    // DB unreachable — don't cache the miss, fall back to "broadcast everything".
    return new Set();
  }
  return cachedBroadcasters.ids;
}

async function canBroadcastSignal(authorId?: string | null): Promise<boolean> {
  const ids = await getBroadcasterIds();
  if (ids.size === 0) return true;
  return Boolean(authorId) && ids.has(authorId as string);
}

const FIELD_LABEL: Record<string, string> = {
  stopLoss: "SL",
  takeProfit: "TP1",
  takeProfit2: "TP2",
  takeProfit3: "TP3",
};

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
  status?: "PENDING" | "ACTIVE";
  authorId?: string | null;
}): Promise<void> {
  if (!BOT_TOKEN) return;
  if (!(await canBroadcastSignal(signal.authorId))) return;
  const isPending = signal.status === "PENDING";
  const dir = signal.direction === "LONG" ? "BUY 📈" : "SELL 📉";
  const tier = signal.tier === "VIP" ? " 💎 VIP" : "";
  const statusLabel = isPending
    ? "🟡 <b>LỆNH CHỜ (PENDING)</b>"
    : `🟢 <b>LỆNH MỚI${tier}</b>`;

  const lines = [
    statusLabel,
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

export async function notifyTelegramUpdatedSignal(signal: {
  id: string;
  symbol: string;
  direction: string;
  changes: { field: string; oldValue: string | null; newValue: string | null }[];
  authorId?: string | null;
}): Promise<void> {
  if (!BOT_TOKEN) return;
  if (!(await canBroadcastSignal(signal.authorId))) return;
  // Chỉ gửi khi có thay đổi SL/TP (bỏ qua notes)
  const relevant = signal.changes.filter((c) => c.field in FIELD_LABEL);
  if (relevant.length === 0) return;

  const dir = signal.direction === "LONG" ? "BUY" : "SELL";
  const lines = [
    `✏️ <b>CẬP NHẬT LỆNH</b>`,
    "",
    `📌 <b>${signal.symbol}</b> | ${dir} | Đang chạy`,
  ];
  for (const c of relevant) {
    const label = FIELD_LABEL[c.field];
    const from = c.oldValue ?? "—";
    const to = c.newValue ?? "xóa";
    lines.push(`${label === "SL" ? "🛑" : "🎯"} ${label}: ${from} → <b>${to}</b>`);
  }
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
  authorId?: string | null;
}): Promise<void> {
  if (!BOT_TOKEN) return;
  if (!(await canBroadcastSignal(signal.authorId))) return;
  if (signal.status === "CANCELLED") return;
  const isWin = signal.status === "CLOSED_WIN";
  const icon = isWin ? "✅" : "❌";
  const label = isWin ? "CHỐT LỜI (TP HIT)" : "DỪNG LỖ (SL HIT)";
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
