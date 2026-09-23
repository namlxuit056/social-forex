import { NextRequest, NextResponse } from "next/server";
import { revalidateLocalizedPath } from "@/lib/revalidate-locales";
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
import { parseMql5Time } from "@/lib/mt5/parse-mql5-time";
import { publishMt5LiveUpdate, type Mt5LiveUpdate } from "@/lib/mt5/live-redis";
import { runAutoCloseChecks } from "@/lib/mt5/auto-close";

function toLiveUpdate(
  account: z.infer<typeof accountSchema>,
  positions: z.infer<typeof positionSchema>[],
  orders: z.infer<typeof pendingOrderSchema>[],
  now: Date,
): Mt5LiveUpdate {
  return {
    account: {
      balance: account.balance,
      equity: account.equity,
      margin: account.margin ?? null,
      freeMargin: account.freeMargin ?? null,
      currency: account.currency ?? null,
      openPositions: positions.length,
      lastSeenAt: now.toISOString(),
    },
    positions: positions.map((p) => ({
      ticket: p.ticket,
      symbol: p.symbol,
      type: p.type,
      volume: p.volume,
      priceOpen: p.priceOpen,
      priceCurrent: p.priceCurrent ?? null,
      stopLoss: p.stopLoss,
      takeProfit: p.takeProfit,
      profit: p.profit ?? null,
      swap: p.swap ?? null,
      openedAt: parseMql5Time(p.openedAt),
      // Rarely-changing config, not part of the EA heartbeat payload — the
      // client preserves its last-known value per ticket across live updates.
      trailingPips: null,
    })),
    orders: orders.map((o) => ({
      ticket: o.ticket,
      symbol: o.symbol,
      type: o.type,
      volume: o.volume,
      priceOpen: o.priceOpen,
      stopLoss: o.stopLoss,
      takeProfit: o.takeProfit,
      openedAt: parseMql5Time(o.openedAt),
    })),
  };
}

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
      lastSeenAt: true,
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

  // Live UI freshness is decoupled from Postgres entirely: publish to Redis
  // on every heartbeat (cheap, doesn't touch Neon) so connected browser tabs
  // get sub-second updates regardless of how the Postgres write below is
  // throttled. If Redis isn't configured this is a no-op.
  await publishMt5LiveUpdate(connection.id, toLiveUpdate(account, positions, orders, now));

  // The EA may heartbeat far more often than the durable snapshot needs —
  // skip the Postgres write (but still ack fast) unless a trade actually
  // changed or enough time has passed since the last persisted heartbeat.
  const MIN_HEARTBEAT_WRITE_INTERVAL_MS = 5_000;
  const heartbeatAge = connection.lastSeenAt ? now.getTime() - connection.lastSeenAt.getTime() : Infinity;
  const shouldPersistHeartbeat = tradeChanged || heartbeatAge >= MIN_HEARTBEAT_WRITE_INTERVAL_MS;

  if (!shouldPersistHeartbeat) {
    return NextResponse.json({
      ok: true,
      receivedAt: now.toISOString(),
      positions: positions.length,
      orders: orders.length,
      signals: 0,
      closedSignals: 0,
      snapshotCreated: false,
      tradeChanged: false,
      throttled: true,
    });
  }

  // Runs on the same throttle cadence as the write above, using its own
  // fresh read — this is what makes weekend/EOD/breakeven/scheduled close
  // work even with no browser tab open, as long as the EA is running.
  try {
    await runAutoCloseChecks(connection.userId);
  } catch {
    // never let the auto-close check break the bridge heartbeat
  }

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

    if (orders.length > 0) {
      await tx.mt5SignalLink.updateMany({
        where: {
          connectionId: connection.id,
          mt5Ticket: { in: orders.map((order) => order.ticket) },
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
            lotSize: order.volume,
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
          lotSize: order.volume,
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
        select: { id: true, signalId: true, journalId: true, maeProfit: true, mfeProfit: true },
      });

      // Track the worst/best floating P/L this position has ever shown (max adverse /
      // favorable excursion). `position.profit` can be absent on a heartbeat — skip those.
      const liveProfit = typeof position.profit === "number" ? position.profit : null;
      const nextMae =
        liveProfit === null
          ? (existing?.maeProfit ?? null)
          : Math.min(existing?.maeProfit ?? liveProfit, liveProfit);
      const nextMfe =
        liveProfit === null
          ? (existing?.mfeProfit ?? null)
          : Math.max(existing?.mfeProfit ?? liveProfit, liveProfit);

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
            lotSize: position.volume,
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
          data: {
            kind: "OPEN_POSITION",
            lastProfit: position.profit,
            maeProfit: nextMae,
            mfeProfit: nextMfe,
            lastSeenAt: now,
            journalId,
          },
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
          lotSize: position.volume,
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
              maeProfit: nextMae,
              mfeProfit: nextMfe,
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
    ...newMt5Signals.map((s) =>
      notifyTelegramNewSignal({ ...s, authorId: connection.userId }),
    ),
    ...closedMt5Signals.map((s) =>
      notifyTelegramClosedSignal({ ...s, authorId: connection.userId }),
    ),
  ]);

  revalidateLocalizedPath("/mt5");
  const changedSignalIds = Array.from(new Set([...touchedSignalIds, ...closedSignalIds]));
  if (changedSignalIds.length > 0) {
    revalidateLocalizedPath("/signals");
    revalidateLocalizedPath("/journal", "page");
    revalidateLocalizedPath(`/u/${connection.userId}`);
    for (const signalId of changedSignalIds) {
      revalidateLocalizedPath(`/signals/${signalId}`);
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
