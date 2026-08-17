import { auth } from "@/auth";
import { getMt5AccountSnapshot } from "@/lib/mt5/account-snapshot";
import { runAutoCloseChecks } from "@/lib/mt5/auto-close";

export const runtime = "nodejs";

// Kept well above the ~5min Neon autosuspend idle window's worth of queries —
// this stream is the single biggest driver of Neon compute-hours since it
// runs continuously for as long as a user has /positions open.
const POLL_MS = 8_000;
const HEARTBEAT_MS = 30_000;

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  let lastPayload = "";
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      async function push() {
        try {
          const snapshot = await getMt5AccountSnapshot(userId);
          if (snapshot) {
            const payload = JSON.stringify(snapshot);
            if (payload !== lastPayload) {
              lastPayload = payload;
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            }
          }
        } catch {
          // keep the stream alive even if a single poll fails
        }

        try {
          await runAutoCloseChecks(userId);
        } catch {
          // never let the auto-close check break the stream
        }
      }

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          cleanup?.();
        }
      }, HEARTBEAT_MS);

      const poll = setInterval(() => void push(), POLL_MS);

      // `start()` runs synchronously during `new ReadableStream(...)`, before the
      // `stream` binding itself is assigned - referencing `stream` in here (even
      // just to stash `cleanup` on it) throws a TDZ ReferenceError. Use a variable
      // from the enclosing scope instead, shared with cancel() via closure.
      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearInterval(poll);
      };

      controller.enqueue(encoder.encode(": connected\n\n"));
      void push();
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
