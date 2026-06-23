import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const clients = new Map<string, ReadableStreamDefaultController>();

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  const stream = new ReadableStream({
    start(controller) {
      clients.set(userId, controller);

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
          clients.delete(userId);
        }
      }, 30_000);

      const checkNewSignals = setInterval(async () => {
        try {
          const following = await prisma.userFollow.findMany({
            where: { followerId: userId },
            select: { followingId: true },
          });
          const followedIds = following.map((f) => f.followingId);

          if (followedIds.length === 0) return;

          const recentSignals = await prisma.signal.findMany({
            where: {
              authorId: { in: followedIds },
              createdAt: { gte: new Date(Date.now() - 60_000) },
            },
            select: {
              id: true,
              symbol: true,
              direction: true,
              tier: true,
              author: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          });

          for (const signal of recentSignals) {
            const data = JSON.stringify({
              type: "new_signal",
              signal: {
                id: signal.id,
                symbol: signal.symbol,
                direction: signal.direction,
                tier: signal.tier,
                author: signal.author.name,
              },
            });
            controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
          }
        } catch {
          // Silent fail
        }
      }, 15_000);

      const cleanup = () => {
        clearInterval(heartbeat);
        clearInterval(checkNewSignals);
        clients.delete(userId);
      };

      controller.enqueue(new TextEncoder().encode(": connected\n\n"));

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
