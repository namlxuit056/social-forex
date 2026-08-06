import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  AiJournalChatUnavailableError,
  getAiJournalChatReply,
} from "@/lib/ai/journal-chat";
import {
  aiJournalChatRequestSchema,
  type AiAdvisorMessage,
  type AiJournalChatHistoryResponse,
  type AiJournalChatSendResponse,
  type AiSuggestError,
} from "@/lib/ai/types";
import { localeFromRequest, type AppLocale } from "@/lib/api-locale";
import { pickAi } from "@/lib/messages-pick";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { isVipActive } from "@/lib/vip";

const HISTORY_LIMIT = 50;
const CONTEXT_LIMIT = 20;
const TRADES_FOR_CONTEXT = 200;

function errorJson(error: string, status: number, retryAfterMs?: number) {
  const body: AiSuggestError = { error, retryAfterMs };
  return NextResponse.json(body, { status });
}

function toRole(role: string): "user" | "assistant" {
  return role === "assistant" ? "assistant" : "user";
}

async function requireVipUser(loc: AppLocale) {
  const ai = pickAi(loc);
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { error: errorJson(ai.apiJournalChatLoginRequired, 401) } as const;
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { vipUntil: true },
  });
  if (!isVipActive(user?.vipUntil)) {
    return { error: errorJson(ai.apiJournalChatVipOnly, 403) } as const;
  }
  return { userId } as const;
}

export async function GET(req: NextRequest) {
  const loc = localeFromRequest(req);
  const auth_ = await requireVipUser(loc);
  if ("error" in auth_) return auth_.error;

  const recent = await prisma.journalChatMessage.findMany({
    where: { userId: auth_.userId },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
    select: { id: true, role: true, content: true, createdAt: true },
  });

  const body: AiJournalChatHistoryResponse = {
    messages: recent
      .slice()
      .reverse()
      .map((m) => ({
        id: m.id,
        role: toRole(m.role),
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
  };

  return NextResponse.json(body);
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

  const parsed = aiJournalChatRequestSchema.safeParse(
    await req.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return errorJson(ai.apiJournalChatInvalidRequest, 400);
  }

  const auth_ = await requireVipUser(loc);
  if ("error" in auth_) return auth_.error;
  const { userId } = auth_;

  const rateLimitKey = `ai-journal-chat:${userId}`;
  const windowMs = 5 * 60_000;
  const { ok, remaining } = rateLimit(rateLimitKey, 12, windowMs);
  if (!ok) {
    return errorJson(ai.apiJournalChatRateLimitVip, 429, remaining === 0 ? windowMs : undefined);
  }

  try {
    const [trades, historyDesc] = await Promise.all([
      prisma.tradeJournal.findMany({
        where: { userId },
        orderBy: { openedAt: "desc" },
        take: TRADES_FOR_CONTEXT,
        select: {
          symbol: true,
          direction: true,
          entry: true,
          stopLoss: true,
          takeProfit: true,
          exitPrice: true,
          lotSize: true,
          result: true,
          pnl: true,
          notes: true,
          openedAt: true,
          closedAt: true,
        },
      }),
      prisma.journalChatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: CONTEXT_LIMIT,
        select: { role: true, content: true },
      }),
    ]);

    const contextMessages: AiAdvisorMessage[] = [
      ...historyDesc
        .slice()
        .reverse()
        .map((m) => ({ role: toRole(m.role), content: m.content })),
      { role: "user" as const, content: parsed.data.content },
    ];

    const reply = await getAiJournalChatReply({
      trades,
      messages: contextMessages,
      locale: loc,
    });

    const [userMessage, assistantMessage] = await prisma.$transaction([
      prisma.journalChatMessage.create({
        data: { userId, role: "user", content: parsed.data.content },
      }),
      prisma.journalChatMessage.create({
        data: { userId, role: "assistant", content: reply },
      }),
    ]);

    const response: AiJournalChatSendResponse = {
      userMessage: {
        id: userMessage.id,
        role: "user",
        content: userMessage.content,
        createdAt: userMessage.createdAt.toISOString(),
      },
      assistantMessage: {
        id: assistantMessage.id,
        role: "assistant",
        content: assistantMessage.content,
        createdAt: assistantMessage.createdAt.toISOString(),
      },
      disclaimer: ai.apiDisclaimer,
    };

    return NextResponse.json(response);
  } catch (e) {
    if (e instanceof AiJournalChatUnavailableError) {
      return errorJson(e.message, 503);
    }
    const msg = e instanceof Error ? e.message : ai.apiUnknownError;
    return errorJson(ai.apiAnalyzeFailed.replace("{message}", msg), 500);
  }
}
