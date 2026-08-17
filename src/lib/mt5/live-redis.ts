import Redis from "ioredis";
import type { LivePosition, Mt5AccountInfo } from "@/app/[locale]/journal/journal-live-panel";
import type { LivePendingOrder } from "@/lib/mt5/account-snapshot";

export type Mt5LiveUpdate = {
  account: Pick<
    Mt5AccountInfo,
    "balance" | "equity" | "margin" | "freeMargin" | "currency" | "openPositions" | "lastSeenAt"
  >;
  positions: LivePosition[];
  orders: LivePendingOrder[];
};

function mt5LiveChannel(connectionId: string): string {
  return `mt5:live:${connectionId}`;
}

export function isMt5LiveRedisEnabled(): boolean {
  return !!process.env.REDIS_URL;
}

const globalForRedis = globalThis as unknown as {
  mt5LivePublisher: Redis | undefined;
};

// Publishing reuses one long-lived connection (cheap, Upstash is built for this)
// — unlike Postgres, an idle Redis connection isn't the thing we're trying to
// avoid here, so a singleton is fine and avoids reconnect overhead per heartbeat.
function getPublisher(): Redis | null {
  if (!isMt5LiveRedisEnabled()) return null;
  if (!globalForRedis.mt5LivePublisher) {
    globalForRedis.mt5LivePublisher = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: 1,
      lazyConnect: false,
    });
    globalForRedis.mt5LivePublisher.on("error", () => {
      // Non-blocking — a Redis hiccup must never break the MT5 bridge heartbeat.
    });
  }
  return globalForRedis.mt5LivePublisher;
}

/** Fire-and-forget — never let a Redis issue break the bridge heartbeat response. */
export async function publishMt5LiveUpdate(connectionId: string, update: Mt5LiveUpdate): Promise<void> {
  const publisher = getPublisher();
  if (!publisher) return;
  try {
    await publisher.publish(mt5LiveChannel(connectionId), JSON.stringify(update));
  } catch {
    // Non-blocking
  }
}

/**
 * A subscribed ioredis connection can't run other commands, so each SSE
 * session gets its own dedicated connection — the caller owns its lifecycle
 * (call `.quit()` when the SSE stream closes).
 */
export function subscribeMt5Live(
  connectionId: string,
  onMessage: (update: Mt5LiveUpdate) => void,
): Redis | null {
  if (!isMt5LiveRedisEnabled()) return null;
  const subscriber = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: 1 });
  subscriber.on("error", () => {
    // Non-blocking — the SSE route's own heartbeat/cleanup handles a dead connection.
  });
  subscriber.subscribe(mt5LiveChannel(connectionId)).catch(() => {
    // Non-blocking
  });
  subscriber.on("message", (_channel, message) => {
    try {
      onMessage(JSON.parse(message) as Mt5LiveUpdate);
    } catch {
      // ignore malformed payloads
    }
  });
  return subscriber;
}
