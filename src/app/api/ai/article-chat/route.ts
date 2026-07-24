import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  AiArticleChatUnavailableError,
  getAiArticleChatReply,
} from "@/lib/ai/article-chat";
import {
  aiArticleChatRequestSchema,
  type AiAdvisorResponse,
  type AiSuggestError,
} from "@/lib/ai/types";
import { localeFromRequest } from "@/lib/api-locale";
import { pickAi } from "@/lib/messages-pick";
import { prisma } from "@/lib/prisma";
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

  const parsed = aiArticleChatRequestSchema.safeParse(
    await req.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return errorJson(ai.apiArticleChatInvalidRequest, 400);
  }

  const article = await prisma.aiGeneratedArticle.findUnique({
    where: { id: parsed.data.articleId },
    select: { title: true, summary: true, body: true, keyword: true, status: true },
  });
  if (!article || article.status !== "PUBLISHED") {
    return errorJson(ai.apiArticleChatArticleNotFound, 404);
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
    ? `ai-article-chat:${userId}`
    : `ai-article-chat:anon:${req.headers.get("x-forwarded-for") ?? "unknown"}`;
  const maxReq = isVip ? 12 : 4;
  const windowMs = 5 * 60_000;
  const { ok, remaining } = rateLimit(rateLimitKey, maxReq, windowMs);

  if (!ok) {
    return errorJson(
      isVip ? ai.apiRateLimitVip : ai.apiArticleChatRateLimitFree,
      429,
      remaining === 0 ? windowMs : undefined,
    );
  }

  try {
    const reply = await getAiArticleChatReply({
      article,
      messages: parsed.data.messages,
      locale: loc,
    });

    const response: AiAdvisorResponse = {
      message: { role: "assistant", content: reply },
      generatedAt: new Date().toISOString(),
      disclaimer: ai.apiDisclaimer,
    };

    return NextResponse.json(response);
  } catch (e) {
    if (e instanceof AiArticleChatUnavailableError) {
      return errorJson(e.message, 503);
    }
    const msg = e instanceof Error ? e.message : ai.apiUnknownError;
    return errorJson(ai.apiAnalyzeFailed.replace("{message}", msg), 500);
  }
}
