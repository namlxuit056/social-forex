import { type NextRequest, NextResponse } from "next/server";
import { getScreenerAiPicks, AiUnavailableError } from "@/lib/ai/screener-picks";
import type { AppLocale } from "@/lib/api-locale";

export const runtime = "nodejs";

export type { AiPickResult, AiPicksResponse } from "@/lib/ai/screener-picks";

export type AiPicksError = {
  error: "ai_unavailable" | "internal_error";
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const locale = (request.nextUrl.searchParams.get("locale") ?? "vi") as AppLocale;

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
