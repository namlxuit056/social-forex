import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { notifyTelegramClosedSignal } from "@/lib/telegram";
import { positionSchema, pendingOrderSchema } from "@/lib/mt5/schemas";
import { closeStaleSignalLinks } from "@/lib/mt5/close-stale-signal-links";

// Safety-net reconciliation for the copy-trade pipeline. The MT5 bridge
// (POST /api/mt5/bridge) closes a linked Signal the instant a heartbeat shows its ticket
// missing from the provider's live positions/orders — but that only fires on the next
// heartbeat *after* the position disappears. If the provider's EA stops sending heartbeats
// (VPS reboot, terminal closed, network drop) before that happens, the Signal is stuck
// ACTIVE/PENDING with nothing to trigger a re-check, and followers' copy-trade EAs keep
// treating it as open (see /api/copy-trade/signals).
//
// This re-runs the exact same "ticket missing -> close" check against each connection's
// last-known snapshot (Mt5Connection.lastPositions/lastOrders, updated on every heartbeat
// regardless of whether trades changed). It can only catch cases the *last received*
// snapshot already reflects — it has no way to learn about a close that happened after the
// provider's EA went dark, since no fresher data exists anywhere. Real-time closing still
// happens via the live bridge; this is a once-daily backstop for missed transitions, not a
// replacement for it.
export async function reconcileStaleMt5Signals(): Promise<{
  connectionsChecked: number;
  closedSignals: number;
}> {
  const connections = await prisma.mt5Connection.findMany({
    where: {
      revokedAt: null,
      signalLinks: { some: { signal: { status: { in: ["PENDING", "ACTIVE"] } } } },
    },
    select: { id: true, userId: true, lastPositions: true, lastOrders: true },
  });

  const now = new Date();
  const allClosedSignalIds: string[] = [];
  const allClosedMt5Signals: Parameters<typeof notifyTelegramClosedSignal>[0][] = [];
  const touchedUserIds = new Set<string>();

  for (const connection of connections) {
    const parsedPositions = positionSchema.array().safeParse(connection.lastPositions);
    const parsedOrders = pendingOrderSchema.array().safeParse(connection.lastOrders);
    const positions = parsedPositions.success ? parsedPositions.data : [];
    const orders = parsedOrders.success ? parsedOrders.data : [];
    const activeMt5Tickets = new Set(positions.map((position) => position.identifier ?? position.ticket));
    const pendingMt5Tickets = new Set(orders.map((order) => order.ticket));

    const { closedSignalIds, closedMt5Signals } = await prisma.$transaction((tx) =>
      closeStaleSignalLinks(tx, connection.id, {
        activeMt5Tickets,
        pendingMt5Tickets,
        closedDealsByPosition: new Map(),
        now,
      }),
    );

    if (closedSignalIds.length > 0) {
      touchedUserIds.add(connection.userId);
      allClosedSignalIds.push(...closedSignalIds);
      allClosedMt5Signals.push(...closedMt5Signals);
    }
  }

  await Promise.allSettled(allClosedMt5Signals.map((s) => notifyTelegramClosedSignal(s)));

  if (allClosedSignalIds.length > 0) {
    revalidatePath("/mt5");
    revalidatePath("/signals");
    revalidatePath("/journal");
    for (const userId of touchedUserIds) {
      revalidatePath(`/u/${userId}`);
    }
    for (const signalId of allClosedSignalIds) {
      revalidatePath(`/signals/${signalId}`);
    }
  }

  return { connectionsChecked: connections.length, closedSignals: allClosedSignalIds.length };
}
