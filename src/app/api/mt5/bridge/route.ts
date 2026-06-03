import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hashMt5BridgeToken, MT5_BRIDGE_TOKEN_PREFIX } from "@/lib/mt5-bridge";
import { prisma } from "@/lib/prisma";

const accountSchema = z.object({
  login: z.union([z.string(), z.number()]).transform(String),
  server: z.string().max(120).optional().nullable(),
  name: z.string().max(120).optional().nullable(),
  company: z.string().max(120).optional().nullable(),
  currency: z.string().max(16).optional().nullable(),
  balance: z.coerce.number(),
  equity: z.coerce.number(),
  margin: z.coerce.number().optional().default(0),
  freeMargin: z.coerce.number().optional().default(0),
  leverage: z.coerce.number().int().positive().optional().nullable(),
});

const positionSchema = z.object({
  ticket: z.union([z.string(), z.number()]).transform(String),
  identifier: z.union([z.string(), z.number()]).optional().transform((v) => v == null ? undefined : String(v)),
  symbol: z.string().min(1).max(40),
  type: z.string().min(1).max(20),
  volume: z.coerce.number(),
  priceOpen: z.coerce.number(),
  priceCurrent: z.coerce.number().optional().nullable(),
  stopLoss: z.coerce.number().optional().nullable(),
  takeProfit: z.coerce.number().optional().nullable(),
  profit: z.coerce.number().optional().nullable(),
  swap: z.coerce.number().optional().nullable(),
  openedAt: z.string().optional().nullable(),
});

const pendingOrderSchema = z.object({
  ticket: z.union([z.string(), z.number()]).transform(String),
  symbol: z.string().min(1).max(40),
  type: z.string().min(1).max(30),
  volume: z.coerce.number(),
  priceOpen: z.coerce.number(),
  stopLoss: z.coerce.number().optional().nullable(),
  takeProfit: z.coerce.number().optional().nullable(),
  openedAt: z.string().optional().nullable(),
});

const payloadSchema = z.object({
  token: z.string().optional(),
  account: accountSchema,
  positions: z.array(positionSchema).max(200).default([]),
  orders: z.array(pendingOrderSchema).max(200).default([]),
  terminal: z
    .object({
      build: z.union([z.string(), z.number()]).optional(),
      name: z.string().optional(),
    })
    .optional(),
});

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.toLowerCase().startsWith("bearer ")) return null;
  return authorization.slice("bearer ".length).trim();
}

function directionFromMt5Type(type: string) {
  return type.toUpperCase().startsWith("BUY") ? "LONG" : "SHORT";
}

function noteForMt5(kind: "pending" | "active", ticket: string, volume: number) {
  const label = kind === "pending" ? "pending order" : "open position";
  return `Synced from MT5 ${label}. Ticket: ${ticket}. Volume: ${volume}. Read-only bridge.`;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const token = bearerToken(request) ?? parsed.data.token;
  if (!token || !token.startsWith(MT5_BRIDGE_TOKEN_PREFIX)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const tokenHash = hashMt5BridgeToken(token);
  const connection = await prisma.mt5Connection.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, revokedAt: true },
  });

  if (!connection || connection.revokedAt) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { account, positions, orders } = parsed.data;
  const now = new Date();

  const touchedSignalIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    await tx.mt5Connection.update({
      where: { id: connection.id },
      data: {
        lastSeenAt: now,
        lastError: null,
        accountLogin: account.login,
        accountServer: account.server,
        accountName: account.name,
        accountCompany: account.company,
        accountCurrency: account.currency,
        balance: account.balance,
        equity: account.equity,
        margin: account.margin,
        freeMargin: account.freeMargin,
        leverage: account.leverage,
        openPositions: positions.length,
        pendingOrders: orders.length,
      },
    });

    await tx.mt5Snapshot.create({
      data: {
        connectionId: connection.id,
        account,
        positions,
        orders,
      },
    });

    for (const order of orders) {
      const existing = await tx.mt5SignalLink.findUnique({
        where: {
          connectionId_mt5Ticket: {
            connectionId: connection.id,
            mt5Ticket: order.ticket,
          },
        },
        select: { id: true, signalId: true },
      });

      if (existing) {
        const signal = await tx.signal.update({
          where: { id: existing.signalId },
          data: {
            symbol: order.symbol.toUpperCase(),
            direction: directionFromMt5Type(order.type),
            entry: order.priceOpen,
            stopLoss: order.stopLoss,
            takeProfit: order.takeProfit,
            status: "PENDING",
            closedAt: null,
            notes: noteForMt5("pending", order.ticket, order.volume),
          },
          select: { id: true },
        });
        await tx.mt5SignalLink.update({
          where: { id: existing.id },
          data: { kind: "PENDING_ORDER", lastSeenAt: now },
        });
        touchedSignalIds.push(signal.id);
        continue;
      }

      const signal = await tx.signal.create({
        data: {
          authorId: connection.userId,
          symbol: order.symbol.toUpperCase(),
          direction: directionFromMt5Type(order.type),
          entry: order.priceOpen,
          stopLoss: order.stopLoss,
          takeProfit: order.takeProfit,
          tier: "FREE",
          status: "PENDING",
          notes: noteForMt5("pending", order.ticket, order.volume),
          mt5Link: {
            create: {
              connectionId: connection.id,
              mt5Ticket: order.ticket,
              kind: "PENDING_ORDER",
              lastSeenAt: now,
            },
          },
        },
        select: { id: true },
      });
      touchedSignalIds.push(signal.id);
    }

    for (const position of positions) {
      const mt5Ticket = position.identifier ?? position.ticket;
      const existing = await tx.mt5SignalLink.findUnique({
        where: {
          connectionId_mt5Ticket: {
            connectionId: connection.id,
            mt5Ticket,
          },
        },
        select: { id: true, signalId: true },
      });

      if (existing) {
        const signal = await tx.signal.update({
          where: { id: existing.signalId },
          data: {
            symbol: position.symbol.toUpperCase(),
            direction: directionFromMt5Type(position.type),
            entry: position.priceOpen,
            stopLoss: position.stopLoss,
            takeProfit: position.takeProfit,
            status: "ACTIVE",
            closedAt: null,
            notes: noteForMt5("active", mt5Ticket, position.volume),
          },
          select: { id: true },
        });
        await tx.mt5SignalLink.update({
          where: { id: existing.id },
          data: { kind: "OPEN_POSITION", lastSeenAt: now },
        });
        touchedSignalIds.push(signal.id);
        continue;
      }

      const signal = await tx.signal.create({
        data: {
          authorId: connection.userId,
          symbol: position.symbol.toUpperCase(),
          direction: directionFromMt5Type(position.type),
          entry: position.priceOpen,
          stopLoss: position.stopLoss,
          takeProfit: position.takeProfit,
          tier: "FREE",
          status: "ACTIVE",
          notes: noteForMt5("active", mt5Ticket, position.volume),
          mt5Link: {
            create: {
              connectionId: connection.id,
              mt5Ticket,
              kind: "OPEN_POSITION",
              lastSeenAt: now,
            },
          },
        },
        select: { id: true },
      });
      touchedSignalIds.push(signal.id);
    }
  });

  revalidatePath("/mt5");
  revalidatePath("/signals");
  revalidatePath(`/u/${connection.userId}`);
  for (const signalId of touchedSignalIds) {
    revalidatePath(`/signals/${signalId}`);
  }

  return NextResponse.json({
    ok: true,
    receivedAt: now.toISOString(),
    positions: positions.length,
    orders: orders.length,
    signals: touchedSignalIds.length,
  });
}
