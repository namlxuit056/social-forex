import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isMt5LiveRedisEnabled, subscribeMt5Live } from "@/lib/mt5/live-redis";

export const runtime = "nodejs";

const HEARTBEAT_MS = 30_000;

// Backed entirely by Redis pub/sub, not Postgres polling — the bridge
// heartbeat (POST /api/mt5/bridge) publishes on every EA call, and this
// route just forwards those messages to the browser. No Neon query happens
// for the lifetime of the stream beyond the one connection lookup below.
export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!isMt5LiveRedisEnabled()) {
    return new Response("Live stream not configured", { status: 501 });
  }

  const connection = await prisma.mt5Connection.findFirst({
    where: { userId: session.user.id, revokedAt: null },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true },
  });
  if (!connection) {
    return new Response("No MT5 connection", { status: 404 });
  }

  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      const subscriber = subscribeMt5Live(connection.id, (update) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(update)}\n\n`));
        } catch {
          cleanup?.();
        }
      });

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          cleanup?.();
        }
      }, HEARTBEAT_MS);

      // `start()` runs synchronously during `new ReadableStream(...)`, before the
      // `stream` binding itself is assigned - referencing `stream` in here throws
      // a TDZ ReferenceError. Use a variable from the enclosing scope instead,
      // shared with cancel() via closure.
      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        void subscriber?.quit();
      };

      controller.enqueue(encoder.encode(": connected\n\n"));
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
