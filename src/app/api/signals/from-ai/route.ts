import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { notifySignalSubscribers } from "@/lib/signals/notify-on-signal-create";
import { localeFromRequest } from "@/lib/api-locale";
import { pickAi, pickErrors } from "@/lib/messages-pick";

const fromAiSignalSchema = z.object({
  symbol: z.string().min(3).max(32),
  direction: z.enum(["LONG", "SHORT"]),
  entry: z.coerce.number().positive(),
  stopLoss: z.coerce.number().positive().optional(),
  takeProfit: z.coerce.number().positive().optional(),
  confidence: z.number().min(1).max(5).optional(),
  reasoning: z.string().min(10).max(1500),
});

export async function POST(req: NextRequest) {
  const loc = localeFromRequest(req);
  const ai = pickAi(loc);
  const errors = pickErrors(loc);
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: ai.apiSignalLoginRequired },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = fromAiSignalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: errors.invalidData }, { status: 400 });
  }

  const userId = session.user.id;
  const { ok } = rateLimit(`signal:${userId}`, 5, 60_000);
  if (!ok) {
    return NextResponse.json({ error: errors.rateLimitSignal }, { status: 429 });
  }

  const data = parsed.data;
  const notes = [
    `AI Forex Expert${data.confidence ? ` (confidence: ${data.confidence}/5)` : ""}`,
    "",
    data.reasoning,
  ].join("\n");

  const signal = await prisma.signal.create({
    data: {
      authorId: userId,
      symbol: data.symbol.toUpperCase(),
      direction: data.direction,
      entry: data.entry,
      stopLoss: data.stopLoss,
      takeProfit: data.takeProfit,
      tier: "FREE",
      notes,
    },
    select: {
      id: true,
      symbol: true,
      tier: true,
      authorId: true,
    },
  });

  try {
    await notifySignalSubscribers({
      id: signal.id,
      symbol: signal.symbol,
      tier: signal.tier,
      authorId: signal.authorId,
    });
  } catch {
    // Non-blocking: signal already created.
  }

  revalidatePath("/signals");
  revalidatePath(`/signals/${signal.id}`);
  revalidatePath("/leaderboard");

  return NextResponse.json({
    signalId: signal.id,
    message: ai.apiSignalCreated,
  });
}
