import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createHash } from "crypto";
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

function closeNoteForMt5(kind: "cancelled" | "closed", ticket: string, profit?: number | null) {
  if (kind === "cancelled") {
    return `Synced from MT5 pending order. Ticket: ${ticket}. Order is no longer pending in MT5.`;
  }

  const profitText = typeof profit === "number" ? ` Last seen profit: ${profit}.` : "";
  return `Synced from MT5 open position. Ticket: ${ticket}. Position is no longer open in MT5.${profitText}`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function tradeHash(positions: z.infer<typeof positionSchema>[], orders: z.infer<typeof pendingOrderSchema>[]) {
  const normalizedPositions = positions
    .map((position) => ({
      ticket: position.ticket,
      identifier: position.identifier,
      symbol: position.symbol.toUpperCase(),
      type: position.type.toUpperCase(),
      volume: position.volume,
      priceOpen: position.priceOpen,
      stopLoss: position.stopLoss ?? null,
      takeProfit: position.takeProfit ?? null,
    }))
    .sort((a, b) => `${a.identifier ?? a.ticket}`.localeCompare(`${b.identifier ?? b.ticket}`));

  const normalizedOrders = orders
    .map((order) => ({
      ticket: order.ticket,
      symbol: order.symbol.toUpperCase(),
      type: order.type.toUpperCase(),
      volume: order.volume,
      priceOpen: order.priceOpen,
      stopLoss: order.stopLoss ?? null,
      takeProfit: order.takeProfit ?? null,
    }))
    .sort((a, b) => a.ticket.localeCompare(b.ticket));

  return createHash("sha256")
    .update(stableStringify({ positions: normalizedPositions, orders: normalizedOrders }))
    .digest("hex");
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
    select: { id: true, userId: true, revokedAt: true, lastTradeHash: true, lastSnapshotAt: true },
  });

  if (!connection || connection.revokedAt) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { account, positions, orders } = parsed.data;
  const now = new Date();
  const nextTradeHash = tradeHash(positions, orders);
  const tradeChanged = connection.lastTradeHash !== nextTradeHash;
  const snapshotExpired =
    !connection.lastSnapshotAt || now.getTime() - connection.lastSnapshotAt.getTime() >= 60_000;
  const shouldCreateSnapshot = tradeChanged || snapshotExpired;
  const activeMt5Tickets = new Set(positions.map((position) => position.identifier ?? position.ticket));
  const pendingMt5Tickets = new Set(orders.map((order) => order.ticket));

  const touchedSignalIds: string[] = [];
  const closedSignalIds: string[] = [];

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
        lastPositions: positions as never,
        lastTradeHash: nextTradeHash,
        lastSnapshotAt: shouldCreateSnapshot ? now : undefined,
      },
    });

    if (shouldCreateSnapshot) {
      await tx.mt5Snapshot.create({
        data: {
          connectionId: connection.id,
          account,
          positions,
          orders,
        },
      });
    }

    for (const order of orders) {
      await tx.mt5SignalLink.updateMany({
        where: {
          connectionId: connection.id,
          mt5Ticket: order.ticket,
          kind: "PENDING_ORDER",
        },
        data: { lastSeenAt: now },
      });
    }

    for (const position of positions) {
      await tx.mt5SignalLink.updateMany({
        where: {
          connectionId: connection.id,
          mt5Ticket: position.identifier ?? position.ticket,
          kind: "OPEN_POSITION",
        },
        data: { lastProfit: position.profit, lastSeenAt: now },
      });
    }

    if (!tradeChanged) return;

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
          data: { kind: "PENDING_ORDER", lastProfit: null, lastSeenAt: now },
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
            lastProfit: null,
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
        select: { id: true, signalId: true, journalId: true },
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

        let { journalId } = existing;
        if (!journalId) {
          const journal = await tx.tradeJournal.create({
            data: {
              userId: connection.userId,
              symbol: position.symbol.toUpperCase(),
              direction: directionFromMt5Type(position.type),
              entry: position.priceOpen,
              stopLoss: position.stopLoss,
              takeProfit: position.takeProfit,
              lotSize: position.volume,
              result: "PENDING",
              openedAt: position.openedAt ? new Date(position.openedAt) : now,
            },
            select: { id: true },
          });
          journalId = journal.id;
        }

        await tx.mt5SignalLink.update({
          where: { id: existing.id },
          data: { kind: "OPEN_POSITION", lastProfit: position.profit, lastSeenAt: now, journalId },
        });
        touchedSignalIds.push(signal.id);
        continue;
      }

      const journal = await tx.tradeJournal.create({
        data: {
          userId: connection.userId,
          symbol: position.symbol.toUpperCase(),
          direction: directionFromMt5Type(position.type),
          entry: position.priceOpen,
          stopLoss: position.stopLoss,
          takeProfit: position.takeProfit,
          lotSize: position.volume,
          result: "PENDING",
          openedAt: position.openedAt ? new Date(position.openedAt) : now,
        },
        select: { id: true },
      });

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
              lastProfit: position.profit,
              lastSeenAt: now,
              journalId: journal.id,
            },
          },
        },
        select: { id: true },
      });
      touchedSignalIds.push(signal.id);
    }

    const liveLinks = await tx.mt5SignalLink.findMany({
      where: {
        connectionId: connection.id,
        signal: { status: { in: ["PENDING", "ACTIVE"] } },
      },
      select: {
        id: true,
        mt5Ticket: true,
        kind: true,
        lastProfit: true,
        signalId: true,
        journalId: true,
        signal: { select: { status: true } },
      },
    });

    for (const link of liveLinks) {
      if (link.kind === "PENDING_ORDER" && link.signal.status === "PENDING" && !pendingMt5Tickets.has(link.mt5Ticket)) {
        const signal = await tx.signal.update({
          where: { id: link.signalId },
          data: {
            status: "CANCELLED",
            closedAt: now,
            notes: closeNoteForMt5("cancelled", link.mt5Ticket),
          },
          select: { id: true },
        });
        closedSignalIds.push(signal.id);
        continue;
      }

      if (link.kind === "OPEN_POSITION" && link.signal.status === "ACTIVE" && !activeMt5Tickets.has(link.mt5Ticket)) {
        const status = typeof link.lastProfit === "number" && link.lastProfit < 0 ? "CLOSED_LOSS" : "CLOSED_WIN";
        const signal = await tx.signal.update({
          where: { id: link.signalId },
          data: {
            status,
            closedAt: now,
            notes: closeNoteForMt5("closed", link.mt5Ticket, link.lastProfit),
          },
          select: { id: true },
        });

        if (link.journalId) {
          const profit = link.lastProfit;
          const result =
            typeof profit === "number"
              ? profit > 0
                ? "WIN"
                : profit < 0
                  ? "LOSS"
                  : "BREAKEVEN"
              : "PENDING";
          await tx.tradeJournal.update({
            where: { id: link.journalId },
            data: { result, pnl: profit, closedAt: now },
          });
        }

        closedSignalIds.push(signal.id);
      }
    }
  });

  revalidatePath("/mt5");
  const changedSignalIds = Array.from(new Set([...touchedSignalIds, ...closedSignalIds]));
  if (changedSignalIds.length > 0) {
    revalidatePath("/signals");
    revalidatePath("/journal");
    revalidatePath(`/u/${connection.userId}`);
    for (const signalId of changedSignalIds) {
      revalidatePath(`/signals/${signalId}`);
    }
  }

  return NextResponse.json({
    ok: true,
    receivedAt: now.toISOString(),
    positions: positions.length,
    orders: orders.length,
    signals: changedSignalIds.length,
    closedSignals: closedSignalIds.length,
    snapshotCreated: shouldCreateSnapshot,
    tradeChanged,
  });
}
