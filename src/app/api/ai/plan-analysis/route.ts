import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  analyzeChartForPlan,
  ChartAnalysisUnavailableError,
  type PlanAnalysisResult,
} from "@/lib/ai/plan-analysis";
import {
  getSymbolTechnicalContext,
  formatTechnicalContextBlock,
  extractSymbolFromKeyword,
} from "@/lib/ai/forex-chart";

type RequestBody = {
  imageUrls?: string[];
  symbols?: string[];
};

type ErrorResponse = { error: string };

export async function POST(req: NextRequest): Promise<NextResponse<PlanAnalysisResult | ErrorResponse>> {
  const hasAiKey =
    !!process.env.GROQ_API_KEY?.trim() || !!process.env.OPENAI_API_KEY?.trim();
  if (!hasAiKey) {
    return NextResponse.json({ error: "AI chưa được cấu hình." }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const userId = session.user.id;
  const { ok } = rateLimit(`plan-analysis:${userId}`, 5, 60_000);
  if (!ok) {
    return NextResponse.json({ error: "Quá nhiều yêu cầu. Thử lại sau ít phút." }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as RequestBody;
  const imageUrls = Array.isArray(body.imageUrls) ? body.imageUrls.filter((u) => typeof u === "string") : [];
  const symbols = Array.isArray(body.symbols) ? body.symbols.filter((s) => typeof s === "string") : [];

  if (imageUrls.length === 0 && symbols.length === 0) {
    return NextResponse.json({ error: "Cần ảnh chart hoặc cặp tiền tệ." }, { status: 400 });
  }

  // Fetch technical context for symbols to enrich the analysis
  let technicalContext: string | null = null;
  if (symbols.length > 0) {
    const contextParts: string[] = [];
    for (const sym of symbols.slice(0, 3)) {
      const extracted = extractSymbolFromKeyword(sym);
      if (!extracted) continue;
      const ctx = await getSymbolTechnicalContext(extracted.symbol, extracted.group).catch(() => null);
      if (ctx) contextParts.push(formatTechnicalContextBlock(ctx));
    }
    if (contextParts.length > 0) technicalContext = contextParts.join("\n\n---\n\n");
  }

  try {
    const result = await analyzeChartForPlan(imageUrls, symbols, technicalContext);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ChartAnalysisUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : "Phân tích thất bại.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
