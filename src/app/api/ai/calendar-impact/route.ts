import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  AiCalendarImpactUnavailableError,
  getAiCalendarImpact,
} from "@/lib/ai/calendar-impact";
import { localeFromRequest } from "@/lib/api-locale";
import type { AiSuggestError } from "@/lib/ai/types";
import { pickAi } from "@/lib/messages-pick";
import { rateLimit } from "@/lib/rate-limit";

const calendarImpactRequestSchema = z.object({
  events: z
    .array(
      z.object({
        id: z.string().min(1).max(120),
        timeUtc: z.string().min(8).max(64),
        currency: z.string().min(2).max(8),
        title: z.string().min(2).max(180),
        impact: z.enum(["low", "medium", "high"]),
        forecast: z.string().max(80).optional(),
        previous: z.string().max(80).optional(),
        actual: z.string().max(80).optional(),
      }),
    )
    .min(1)
    .max(30),
});

function errorJson(error: string, status: number, retryAfterMs?: number) {
  const body: AiSuggestError = { error, retryAfterMs };
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  const loc = localeFromRequest(req);
  const ai = pickAi(loc);

  const session = await auth();
  if (!session?.user?.id) {
    return errorJson(ai.apiCalendarLoginRequired, 401);
  }

  const hasAiKey =
    !!process.env.GROQ_API_KEY?.trim() ||
    !!process.env.OPENAI_API_KEY?.trim();
  if (!hasAiKey) {
    return errorJson(ai.apiNotConfigured, 503);
  }

  const parsed = calendarImpactRequestSchema.safeParse(
    await req.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return errorJson(ai.apiAdvisorInvalidRequest, 400);
  }

  const rateLimitKey = `ai-calendar:${session.user.id}`;
  const windowMs = 5 * 60_000;
  const { ok, remaining } = rateLimit(rateLimitKey, 6, windowMs);
  if (!ok) {
    return errorJson(ai.apiAdvisorRateLimitFree, 429, remaining === 0 ? windowMs : undefined);
  }

  try {
    const impact = await getAiCalendarImpact(parsed.data.events, loc);
    return NextResponse.json({
      impact,
      generatedAt: new Date().toISOString(),
      disclaimer: ai.apiDisclaimer,
    });
  } catch (e) {
    if (e instanceof AiCalendarImpactUnavailableError) {
      return errorJson(e.message, 503);
    }
    const message = e instanceof Error ? e.message : ai.apiUnknownError;
    return errorJson(ai.apiAnalyzeFailed.replace("{message}", message), 500);
  }
}
