import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  AiAdvisorUnavailableError,
  detectAdvisorSymbols,
  getAiAdvisorReply,
} from "@/lib/ai/advisor";
import {
  aiAdvisorRequestSchema,
  type AiAdvisorResponse,
  type AiSuggestError,
} from "@/lib/ai/types";
import { localeFromRequest } from "@/lib/api-locale";
import { pickAi } from "@/lib/messages-pick";
import { prisma } from "@/lib/prisma";
import { resolveQuotes } from "@/lib/quotes/resolve-quotes";
import { clientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { isVipActive } from "@/lib/vip";

function errorJson(error: string, status: number, retryAfterMs?: number) {
  const body: AiSuggestError = { error, retryAfterMs };
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  const loc = localeFromRequest(req);
  const ai = pickAi(loc);

  const hasAiKey =
    !!process.env.GROQ_API_KEY?.trim() ||
    !!process.env.OPENAI_API_KEY?.trim();
  if (!hasAiKey) {
    return errorJson(ai.apiNotConfigured, 503);
  }

  const parsed = aiAdvisorRequestSchema.safeParse(
    await req.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return errorJson(ai.apiAdvisorInvalidRequest, 400);
  }

  const session = await auth();
  const userId = session?.user?.id;

  let isVip = false;
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { vipUntil: true },
    });
    isVip = isVipActive(user?.vipUntil);
  }

  const rateLimitKey = userId
    ? `ai-advisor:${userId}`
    : `ai-advisor:anon:${clientIp(req.headers)}`;
  const maxReq = isVip ? 12 : 4;
  const windowMs = 5 * 60_000;
  const { ok, remaining } = rateLimit(rateLimitKey, maxReq, windowMs);

  if (!ok) {
    return errorJson(
      isVip ? ai.apiRateLimitVip : ai.apiAdvisorRateLimitFree,
      429,
      remaining === 0 ? windowMs : undefined,
    );
  }

  try {
    const symbols = detectAdvisorSymbols(parsed.data.messages);
    const quoteResult = symbols.length > 0 ? await resolveQuotes() : null;
    const quoteContext =
      quoteResult?.quotes.filter((quote) => symbols.includes(quote.symbol)) ??
      [];
    const reply = await getAiAdvisorReply({
      messages: parsed.data.messages,
      locale: loc,
      quotes: quoteContext,
    });

    const response: AiAdvisorResponse = {
      message: { role: "assistant", content: reply },
      generatedAt: new Date().toISOString(),
      disclaimer: ai.apiDisclaimer,
    };

    return NextResponse.json(response);
  } catch (e) {
    if (e instanceof AiAdvisorUnavailableError) {
      return errorJson(e.message, 503);
    }
    const msg = e instanceof Error ? e.message : ai.apiUnknownError;
    return errorJson(ai.apiAnalyzeFailed.replace("{message}", msg), 500);
  }
}
