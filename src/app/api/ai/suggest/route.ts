import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { rateLimit } from "@/lib/rate-limit";
import { resolveQuotes } from "@/lib/quotes/resolve-quotes";
import { QUOTE_BY_SYMBOL } from "@/lib/quotes/definitions";
import { getAiSuggestion, AiUnavailableError } from "@/lib/ai/suggest";
import type { AiSuggestResponse, AiSuggestError } from "@/lib/ai/types";

const FREE_SYMBOL = "EURUSD";
const DISCLAIMER =
  "Đề xuất AI chỉ mang tính tham khảo và giáo dục, không phải tư vấn đầu tư. Bạn tự chịu trách nhiệm về mọi quyết định giao dịch.";

function errorJson(error: string, status: number, retryAfterMs?: number) {
  const body: AiSuggestError = { error, retryAfterMs };
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  const hasAiKey =
    !!process.env.GROQ_API_KEY?.trim() ||
    !!process.env.OPENAI_API_KEY?.trim();
  if (!hasAiKey) {
    return errorJson("AI chưa được kích hoạt trên hệ thống.", 503);
  }

  const session = await auth();
  const userId = session?.user?.id;

  const body = (await req.json().catch(() => ({}))) as { symbol?: string };
  const symbol = (body.symbol ?? FREE_SYMBOL).toUpperCase();

  if (!QUOTE_BY_SYMBOL[symbol]) {
    return errorJson("Symbol không được hỗ trợ.", 400);
  }

  let isVip = false;
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { vipUntil: true },
    });
    isVip = isVipActive(user?.vipUntil);
  }

  if (symbol !== FREE_SYMBOL && !isVip) {
    return errorJson(
      `Nâng cấp VIP để phân tích AI cho ${symbol}. Bản Free chỉ hỗ trợ ${FREE_SYMBOL}.`,
      403,
    );
  }

  const rateLimitKey = userId ? `ai:${userId}` : `ai:anon:${req.headers.get("x-forwarded-for") ?? "unknown"}`;
  const maxReq = isVip ? 3 : 1;
  const windowMs = isVip ? 60_000 : 300_000;
  const { ok, remaining } = rateLimit(rateLimitKey, maxReq, windowMs);

  if (!ok) {
    const retryAfterMs = remaining === 0 ? windowMs : undefined;
    return errorJson(
      isVip
        ? "Giới hạn 3 lần/phút. Vui lòng chờ."
        : "Giới hạn 1 lần/5 phút. Nâng VIP để phân tích nhiều hơn.",
      429,
      retryAfterMs,
    );
  }

  const { quotes } = await resolveQuotes();
  const quote = quotes.find((q) => q.symbol === symbol);
  if (!quote) {
    return errorJson("Không có dữ liệu giá cho symbol này.", 404);
  }

  try {
    const suggestion = await getAiSuggestion(quote);

    const response: AiSuggestResponse = {
      symbol,
      suggestion,
      generatedAt: new Date().toISOString(),
      disclaimer: DISCLAIMER,
    };

    return NextResponse.json(response);
  } catch (e) {
    if (e instanceof AiUnavailableError) {
      return errorJson(e.message, 503);
    }
    const msg = e instanceof Error ? e.message : "Lỗi AI không xác định";
    return errorJson(`Không thể phân tích lúc này: ${msg}`, 500);
  }
}
