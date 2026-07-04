"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { commandExpiresAt } from "@/lib/mt5/command-ttl";
import { queueCloseAll } from "@/lib/mt5/commands";
import { getPipSize } from "@/lib/mt5/pip-size";
import { resolveQuotes } from "@/lib/quotes/resolve-quotes";

// Orders placed with no explicit SL get one 10% away from entry, so a position
// is never left fully unprotected. User can still override it in the form.
const DEFAULT_STOP_LOSS_DISTANCE_PCT = 0.1;

function roundToSymbolPrecision(price: number, symbol: string): number {
  const pipSize = getPipSize(symbol);
  const decimals = Math.max(0, Math.round(-Math.log10(pipSize)) + 1);
  return Number(price.toFixed(decimals));
}

async function estimateDefaultStopLoss(symbol: string, isBuy: boolean, entryPrice: number | null): Promise<number | null> {
  let referencePrice = entryPrice;
  if (referencePrice == null) {
    const { quotes } = await resolveQuotes();
    const quote = quotes.find((q) => q.symbol === symbol);
    referencePrice = quote ? (isBuy ? quote.ask : quote.bid) : null;
  }
  if (referencePrice == null) return null;

  const distance = referencePrice * DEFAULT_STOP_LOSS_DISTANCE_PCT;
  const stopLoss = isBuy ? referencePrice - distance : referencePrice + distance;
  return roundToSymbolPrecision(stopLoss, symbol);
}

async function getActiveConnection(userId: string) {
  return prisma.mt5Connection.findFirst({
    where: { userId, revokedAt: null },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true },
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
}): Promise<{ error?: string }> {
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

  const isBuy = parsed.data.orderType.startsWith("BUY");
  const stopLoss =
    parsed.data.stopLoss ??
    (await estimateDefaultStopLoss(parsed.data.symbol, isBuy, isPending ? (parsed.data.price ?? null) : null));

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
