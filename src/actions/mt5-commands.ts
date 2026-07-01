"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

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

  await prisma.mt5Command.create({
    data: {
      connectionId: connection.id,
      type: `PLACE_${parsed.data.orderType}`,
      symbol: parsed.data.symbol,
      volume: parsed.data.volume,
      price: isPending ? parsed.data.price : null,
      stopLoss: parsed.data.stopLoss ?? null,
      takeProfit: parsed.data.takeProfit ?? null,
    },
  });

  return {};
}

export async function closeAllPositions(): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const connection = await getActiveConnection(session.user.id);
  if (!connection) return { error: "no_connection" };

  await prisma.mt5Command.create({
    data: {
      connectionId: connection.id,
      type: "CLOSE_ALL",
    },
  });

  return {};
}
