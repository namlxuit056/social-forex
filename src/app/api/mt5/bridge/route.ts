import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createHash } from "crypto";
import { z } from "zod";
import { hashMt5BridgeToken, MT5_BRIDGE_TOKEN_PREFIX } from "@/lib/mt5-bridge";
import { prisma } from "@/lib/prisma";
import {
  notifyTelegramNewSignal,
  notifyTelegramClosedSignal,
} from "@/lib/telegram";
import {
  accountSchema,
  aggregateClosedDeals,
  closedDealSchema,
  directionFromMt5Type,
  pendingOrderSchema,
  positionSchema,
} from "@/lib/mt5/schemas";
import { closeStaleSignalLinks } from "@/lib/mt5/close-stale-signal-links";

const payloadSchema = z.object({
  token: z.string().optional(),
  account: accountSchema,
  positions: z.array(positionSchema).max(200).default([]),
  orders: z.array(pendingOrderSchema).max(200).default([]),
  closedDeals: z.array(closedDealSchema).max(1000).default([]),
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

function noteForMt5(kind: "pending" | "active", ticket: string, volume: number) {
  const label = kind === "pending" ? "pending order" : "open position";
  return `Synced from MT5 ${label}. Ticket: ${ticket}. Volume: ${volume}. Read-only bridge.`;
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
    select: {
      id: true,
      userId: true,
      revokedAt: true,
      lastTradeHash: true,
      lastSnapshotAt: true,
      user: { select: { copyTradingPaused: true } },
    },
  });

  if (!connection || connection.revokedAt) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { account, positions, orders, closedDeals } = parsed.data;
  const now = new Date();
  const closedDealsByPosition = aggregateClosedDeals(closedDeals);
  const nextTradeHash = tradeHash(positions, orders);
  const tradeChanged = connection.lastTradeHash !== nextTradeHash;
  const snapshotExpired =
    !connection.lastSnapshotAt || now.getTime() - connection.lastSnapshotAt.getTime() >= 60_000;
  const shouldCreateSnapshot = tradeChanged || snapshotExpired;
  const activeMt5Tickets = new Set(positions.map((position) => position.identifier ?? position.ticket));
  const pendingMt5Tickets = new Set(orders.map((order) => order.ticket));

  const touchedSignalIds: string[] = [];
  const closedSignalIds: string[] = [];
  const newMt5Signals: Parameters<typeof notifyTelegramNewSignal>[0][] = [];
  const closedMt5Signals: Parameters<typeof notifyTelegramClosedSignal>[0][] =
    [];

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
        lastOrders: orders as never,
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
            orderType: order.type.toUpperCase(),
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
          orderType: order.type.toUpperCase(),
          entry: order.priceOpen,
          stopLoss: order.stopLoss,
          takeProfit: order.takeProfit,
          tier: "FREE",
          status: "PENDING",
          notes: noteForMt5("pending", order.ticket, order.volume),
          excludedFromCopy: connection.user.copyTradingPaused,
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
      if (!connection.user.copyTradingPaused) {
        newMt5Signals.push({
          id: signal.id,
          symbol: order.symbol.toUpperCase(),
          direction: directionFromMt5Type(order.type),
          entry: order.priceOpen,
          stopLoss: order.stopLoss,
          takeProfit: order.takeProfit,
          tier: "FREE",
          status: "PENDING",
        });
      }
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
            orderType: position.type.toUpperCase(),
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
          orderType: position.type.toUpperCase(),
          entry: position.priceOpen,
          stopLoss: position.stopLoss,
          takeProfit: position.takeProfit,
          tier: "FREE",
          status: "ACTIVE",
          notes: noteForMt5("active", mt5Ticket, position.volume),
          excludedFromCopy: connection.user.copyTradingPaused,
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
      if (!connection.user.copyTradingPaused) {
        newMt5Signals.push({
          id: signal.id,
          symbol: position.symbol.toUpperCase(),
          direction: directionFromMt5Type(position.type),
          entry: position.priceOpen,
          stopLoss: position.stopLoss,
          takeProfit: position.takeProfit,
          tier: "FREE",
          status: "ACTIVE",
        });
      }
      touchedSignalIds.push(signal.id);
    }

    const closeResult = await closeStaleSignalLinks(tx, connection.id, {
      activeMt5Tickets,
      pendingMt5Tickets,
      closedDealsByPosition,
      now,
    });
    closedSignalIds.push(...closeResult.closedSignalIds);
    closedMt5Signals.push(...closeResult.closedMt5Signals);
  });

  // Send Telegram notifications outside the DB transaction
  await Promise.allSettled([
    ...newMt5Signals.map((s) => notifyTelegramNewSignal(s)),
    ...closedMt5Signals.map((s) => notifyTelegramClosedSignal(s)),
  ]);

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
