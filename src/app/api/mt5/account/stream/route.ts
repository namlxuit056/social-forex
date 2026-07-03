import { auth } from "@/auth";
import { getMt5AccountSnapshot } from "@/lib/mt5/account-snapshot";

export const runtime = "nodejs";

const POLL_MS = 2_000;
const HEARTBEAT_MS = 30_000;

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  let lastPayload = "";

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      function cleanup() {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearInterval(poll);
      }

      async function push() {
        try {
          const snapshot = await getMt5AccountSnapshot(userId);
          if (!snapshot) return;
          const payload = JSON.stringify(snapshot);
          if (payload === lastPayload) return;
          lastPayload = payload;
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch {
          // keep the stream alive even if a single poll fails
        }
      }

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          cleanup();
        }
      }, HEARTBEAT_MS);

      const poll = setInterval(() => void push(), POLL_MS);

      controller.enqueue(encoder.encode(": connected\n\n"));
      void push();

      (stream as unknown as { cleanup?: () => void }).cleanup = cleanup;
    },
    cancel() {
      const cleanup = (stream as unknown as { cleanup?: () => void }).cleanup;
      if (cleanup) cleanup();
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
