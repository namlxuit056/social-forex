"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { commandExpiresAt } from "@/lib/mt5/command-ttl";
import { queueCloseAll } from "@/lib/mt5/commands";
import { resolveQuotes } from "@/lib/quotes/resolve-quotes";
import { estimateStopLossForRisk, roundToSymbolPrecision } from "@/lib/calculators";
import { isOverDailyTradeLimit, utcDayRange } from "@/lib/journal/daily-limit";

// Orders placed with no explicit SL get one sized to risk 10% of account
// equity, so a position is never left fully unprotected. Same pip-value
// formula as the Risk Calculator tool (src/lib/calculators). User can still
// override it in the form.
const DEFAULT_STOP_LOSS_RISK_PCT = 10;

async function estimateDefaultStopLoss(params: {
  symbol: string;
  isBuy: boolean;
  volume: number;
  entryPrice: number | null;
  equity: number | null;
}): Promise<number | null> {
  const { symbol, isBuy, volume, equity } = params;

  let referencePrice = params.entryPrice;
  if (referencePrice == null) {
    const { quotes } = await resolveQuotes();
    const quote = quotes.find((q) => q.symbol === symbol);
    referencePrice = quote ? (isBuy ? quote.ask : quote.bid) : null;
  }
  if (referencePrice == null || equity == null) return null;

  const stopLoss = estimateStopLossForRisk({
    symbol,
    isBuy,
    entryPrice: referencePrice,
    volume,
    equity,
    riskPct: DEFAULT_STOP_LOSS_RISK_PCT,
  });
  return stopLoss == null ? null : roundToSymbolPrecision(stopLoss, symbol);
}

/**
 * So với DailyTradingPlan.maxTrades của user (ngày hiện tại, UTC). Đếm lệnh mới đã
 * đặt trong ngày qua Mt5Command (type PLACE_*) của connection đang active.
 *
 * TODO business: maxRiskPercent chưa enforce ở đây — market order (BUY/SELL) không
 * lưu giá vào lệnh (price chỉ lưu cho lệnh pending) nên không thể tính lại risk $ đã
 * dùng trong ngày từ Mt5Command một cách đáng tin cậy mà không đoán số liệu.
 */
async function checkDailyOrderLimit(userId: string, connectionId: string) {
  const { start, end } = utcDayRange(new Date());
  const plan = await prisma.dailyTradingPlan.findUnique({
    where: { userId_planDate: { userId, planDate: start } },
    select: { maxTrades: true },
  });
  if (!plan?.maxTrades) return null;

  const ordersPlacedToday = await prisma.mt5Command.count({
    where: {
      connectionId,
      type: { startsWith: "PLACE_" },
      createdAt: { gte: start, lt: end },
    },
  });
  if (!isOverDailyTradeLimit(ordersPlacedToday, plan.maxTrades)) return null;

  return { ordersPlacedToday, maxTrades: plan.maxTrades };
}

/**
 * Cảnh báo mềm khi cặp đang vào lệnh KHÔNG nằm trong plan hôm nay
 * (DailyTradingPlan.watchedSymbols của ngày UTC hiện tại) — kể cả khi chưa lập plan
 * nào. Không chặn lệnh, chỉ để client hiện confirm "vẫn đặt".
 */
async function checkSymbolPlanned(
  userId: string,
  symbol: string,
): Promise<{ symbol: string; hasPlan: boolean } | null> {
  const { start } = utcDayRange(new Date());
  const plan = await prisma.dailyTradingPlan.findUnique({
    where: { userId_planDate: { userId, planDate: start } },
    select: { watchedSymbols: true },
  });
  const planned = (plan?.watchedSymbols ?? []).map((s) => s.toUpperCase());
  if (planned.includes(symbol.toUpperCase())) return null;
  return { symbol, hasPlan: (plan?.watchedSymbols?.length ?? 0) > 0 };
}

async function getActiveConnection(userId: string) {
  return prisma.mt5Connection.findFirst({
    where: { userId, revokedAt: null },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, equity: true },
  });
}

const modifySchema = z.object({
  ticket: z.string().min(1),
  stopLoss: z.coerce.number().nullable().optional(),
  takeProfit: z.coerce.number().nullable().optional(),
});

const ORDER_TYPES = ["BUY", "SELL", "BUY_LIMIT", "SELL_LIMIT", "BUY_STOP", "SELL_STOP"] as const;
export type PlaceOrderType = (typeof ORDER_TYPES)[number];

const placeOrderSchema = z.object({
  symbol: z.string().trim().min(3).max(20).transform((v) => v.toUpperCase()),
  orderType: z.enum(ORDER_TYPES),
  volume: z.coerce.number().positive().max(100),
  price: z.coerce.number().positive().nullable().optional(),
  stopLoss: z.coerce.number().nullable().optional(),
  takeProfit: z.coerce.number().nullable().optional(),
});

export async function closePosition(ticket: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const connection = await getActiveConnection(session.user.id);
  if (!connection) return { error: "no_connection" };

  await prisma.mt5Command.create({
    data: {
      connectionId: connection.id,
      type: "CLOSE_POSITION",
      ticket,
      expiresAt: commandExpiresAt("CLOSE_POSITION"),
    },
  });

  return {};
}

const partialCloseSchema = z.object({
  ticket: z.string().min(1),
  volume: z.coerce.number().positive(),
});

export async function partialClosePosition(ticket: string, volume: number): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const parsed = partialCloseSchema.safeParse({ ticket, volume });
  if (!parsed.success) return { error: "invalid_params" };

  const connection = await getActiveConnection(session.user.id);
  if (!connection) return { error: "no_connection" };

  await prisma.mt5Command.create({
    data: {
      connectionId: connection.id,
      type: "PARTIAL_CLOSE",
      ticket: parsed.data.ticket,
      volume: parsed.data.volume,
      expiresAt: commandExpiresAt("PARTIAL_CLOSE"),
    },
  });

  return {};
}

export async function cancelOrder(ticket: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const connection = await getActiveConnection(session.user.id);
  if (!connection) return { error: "no_connection" };

  await prisma.mt5Command.create({
    data: {
      connectionId: connection.id,
      type: "CANCEL_ORDER",
      ticket,
      expiresAt: commandExpiresAt("CANCEL_ORDER"),
    },
  });

  return {};
}

export async function modifyPosition(
  ticket: string,
  stopLoss: number | null,
  takeProfit: number | null,
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const parsed = modifySchema.safeParse({ ticket, stopLoss, takeProfit });
  if (!parsed.success) return { error: "invalid_params" };

  const connection = await getActiveConnection(session.user.id);
  if (!connection) return { error: "no_connection" };

  await prisma.mt5Command.create({
    data: {
      connectionId: connection.id,
      type: "MODIFY_POSITION",
      ticket: parsed.data.ticket,
      stopLoss: parsed.data.stopLoss ?? null,
      takeProfit: parsed.data.takeProfit ?? null,
      expiresAt: commandExpiresAt("MODIFY_POSITION"),
    },
  });

  return {};
}

export async function modifyOrder(
  ticket: string,
  stopLoss: number | null,
  takeProfit: number | null,
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const parsed = modifySchema.safeParse({ ticket, stopLoss, takeProfit });
  if (!parsed.success) return { error: "invalid_params" };

  const connection = await getActiveConnection(session.user.id);
  if (!connection) return { error: "no_connection" };

  await prisma.mt5Command.create({
    data: {
      connectionId: connection.id,
      type: "MODIFY_ORDER",
      ticket: parsed.data.ticket,
      stopLoss: parsed.data.stopLoss ?? null,
      takeProfit: parsed.data.takeProfit ?? null,
      expiresAt: commandExpiresAt("MODIFY_ORDER"),
    },
  });

  return {};
}

export async function placeOrder(input: {
  symbol: string;
  orderType: PlaceOrderType;
  volume: number;
  price: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  confirmedOverLimit?: boolean;
  confirmedNoPlan?: boolean;
}): Promise<{
  error?: string;
  dailyLimitWarning?: { ordersPlacedToday: number; maxTrades: number };
  planWarning?: { symbol: string; hasPlan: boolean };
}> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid_params" };

  const isPending = parsed.data.orderType !== "BUY" && parsed.data.orderType !== "SELL";
  if (isPending && !(parsed.data.price && parsed.data.price > 0)) {
    return { error: "price_required" };
  }

  const connection = await getActiveConnection(session.user.id);
  if (!connection) return { error: "no_connection" };

  if (!input.confirmedOverLimit || !input.confirmedNoPlan) {
    const [planWarning, limit] = await Promise.all([
      input.confirmedNoPlan
        ? Promise.resolve(null)
        : checkSymbolPlanned(session.user.id, parsed.data.symbol),
      input.confirmedOverLimit
        ? Promise.resolve(null)
        : checkDailyOrderLimit(session.user.id, connection.id),
    ]);
    if (planWarning || limit) {
      return {
        ...(planWarning ? { planWarning } : {}),
        ...(limit ? { dailyLimitWarning: limit } : {}),
      };
    }
  }

  const isBuy = parsed.data.orderType.startsWith("BUY");
  const stopLoss =
    parsed.data.stopLoss ??
    (await estimateDefaultStopLoss({
      symbol: parsed.data.symbol,
      isBuy,
      volume: parsed.data.volume,
      entryPrice: isPending ? (parsed.data.price ?? null) : null,
      equity: connection.equity,
    }));

  const placeType = `PLACE_${parsed.data.orderType}`;
  await prisma.mt5Command.create({
    data: {
      connectionId: connection.id,
      type: placeType,
      symbol: parsed.data.symbol,
      volume: parsed.data.volume,
      price: isPending ? parsed.data.price : null,
      stopLoss,
      takeProfit: parsed.data.takeProfit ?? null,
      expiresAt: commandExpiresAt(placeType),
    },
  });

  return {};
}

export async function closeAllPositions(): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const connection = await getActiveConnection(session.user.id);
  if (!connection) return { error: "no_connection" };

  await queueCloseAll(connection.id);

  return {};
}

const autoCloseSchema = z.object({ enabled: z.boolean() });

export async function setMt5AutoCloseBeforeWeekend(enabled: boolean): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const parsed = autoCloseSchema.safeParse({ enabled });
  if (!parsed.success) return { error: "invalid_params" };

  const connection = await getActiveConnection(session.user.id);
  if (!connection) return { error: "no_connection" };

  await prisma.mt5Connection.update({
    where: { id: connection.id },
    data: { autoCloseBeforeWeekend: parsed.data.enabled },
  });

  return {};
}

export async function setMt5AutoCloseEndOfDay(enabled: boolean): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const parsed = autoCloseSchema.safeParse({ enabled });
  if (!parsed.success) return { error: "invalid_params" };

  const connection = await getActiveConnection(session.user.id);
  if (!connection) return { error: "no_connection" };

  await prisma.mt5Connection.update({
    where: { id: connection.id },
    data: { autoCloseEndOfDay: parsed.data.enabled },
  });

  return {};
}

export async function setMt5CloseAllAtBreakeven(enabled: boolean): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const parsed = autoCloseSchema.safeParse({ enabled });
  if (!parsed.success) return { error: "invalid_params" };

  const connection = await getActiveConnection(session.user.id);
  if (!connection) return { error: "no_connection" };

  await prisma.mt5Connection.update({
    where: { id: connection.id },
    data: { closeAllAtBreakeven: parsed.data.enabled },
  });

  return {};
}

const scheduledCloseSchema = z.object({
  enabled: z.boolean(),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable(),
  tz: z.enum(["utc", "vn"]),
});

export async function setMt5ScheduledClose(params: {
  enabled: boolean;
  time: string | null;
  tz: "utc" | "vn";
}): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const parsed = scheduledCloseSchema.safeParse(params);
  if (!parsed.success) return { error: "invalid_params" };
  if (parsed.data.enabled && !parsed.data.time) return { error: "invalid_params" };

  const connection = await getActiveConnection(session.user.id);
  if (!connection) return { error: "no_connection" };

  await prisma.mt5Connection.update({
    where: { id: connection.id },
    data: {
      scheduledCloseEnabled: parsed.data.enabled,
      scheduledCloseTime: parsed.data.time,
      scheduledCloseTz: parsed.data.tz,
    },
  });

  return {};
}
