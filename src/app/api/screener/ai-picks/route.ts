import { type NextRequest, NextResponse } from "next/server";
import { getScreenerAiPicks, AiUnavailableError } from "@/lib/ai/screener-picks";
import { parseLocaleParam } from "@/lib/api-locale";
import { clientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export type { AiPickResult, AiPicksResponse } from "@/lib/ai/screener-picks";

export type AiPicksError = {
  error: "ai_unavailable" | "internal_error";
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const locale = parseLocaleParam(request.nextUrl.searchParams.get("locale"));

  if (!rateLimit(`screener-ai-picks:${clientIp(request.headers)}`, 20, 10 * 60_000).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  try {
    const result = await getScreenerAiPicks(locale);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AiUnavailableError) {
      return NextResponse.json(
        { error: "ai_unavailable" } satisfies AiPicksError,
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "internal_error" } satisfies AiPicksError,
      { status: 500 },
    );
  }
}
