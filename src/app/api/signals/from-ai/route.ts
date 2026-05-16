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
  qualityScore: z.number().min(0).max(100).optional(),
  tradeChecklist: z
    .array(
      z.object({
        label: z.string().min(3).max(80),
        status: z.enum(["pass", "warn", "fail"]),
        detail: z.string().min(3).max(180),
      }),
    )
    .max(6)
    .optional(),
  riskPlan: z
    .object({
      accountBalance: z.number().positive(),
      riskPct: z.number().positive(),
      slPips: z.number().nonnegative(),
      riskAmount: z.number().nonnegative(),
      lots: z.number().nonnegative(),
    })
    .optional(),
  newsContext: z
    .object({
      riskLevel: z.enum(["low", "medium", "high"]),
      events: z
        .array(
          z.object({
            currency: z.string(),
            title: z.string(),
            impact: z.enum(["medium", "high"]),
            minutesFromNow: z.number(),
            timeUtc: z.string(),
          }),
        )
        .optional(),
    })
    .optional(),
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
  const checklist =
    data.tradeChecklist?.map(
      (item) => `- [${item.status.toUpperCase()}] ${item.label}: ${item.detail}`,
    ) ?? [];
  const riskPlan = data.riskPlan
    ? [
        "",
        "Risk plan:",
        `- Balance: $${data.riskPlan.accountBalance}`,
        `- Risk: ${data.riskPlan.riskPct}% ($${data.riskPlan.riskAmount})`,
        `- SL distance: ${data.riskPlan.slPips} pips`,
        `- Suggested lots: ${data.riskPlan.lots}`,
      ]
    : [];
  const newsEvents = data.newsContext?.events?.slice(0, 5) ?? [];
  const newsRisk = data.newsContext
    ? [
        "",
        `News risk: ${data.newsContext.riskLevel.toUpperCase()}`,
        ...(newsEvents.length > 0
          ? newsEvents.map((event) => {
              const direction = event.minutesFromNow >= 0 ? "in" : "ago";
              return `- ${event.currency} ${event.impact.toUpperCase()}: ${event.title} (${direction} ${Math.abs(event.minutesFromNow)}m)`;
            })
          : ["- No related medium/high impact news in the monitored window."]),
      ]
    : [];
  const notes = [
    `AI Forex Expert${data.confidence ? ` (confidence: ${data.confidence}/5)` : ""}${data.qualityScore !== undefined ? ` · quality: ${data.qualityScore}/100` : ""}`,
    ...(checklist.length > 0 ? ["", "Trade checklist:", ...checklist] : []),
    ...newsRisk,
    ...riskPlan,
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
