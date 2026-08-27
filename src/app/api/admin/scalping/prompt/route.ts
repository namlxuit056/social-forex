import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";
import { resolveQuotes } from "@/lib/quotes/resolve-quotes";
import { getScalpingTechnicalContext } from "@/lib/ai/scalping-tradingview-context";
import { getAiNewsContext } from "@/lib/ai/news-context";
import { SCALPING_SYSTEM_PROMPT, buildScalpingUserPrompt } from "@/lib/ai/scalping-prompt";
import { resolveAiProvider } from "@/lib/ai/provider";
import type { QuoteRow } from "@/lib/quotes/types";

export const dynamic = "force-dynamic";

/** Admin-only: shows the exact system + user prompt the Auto-Scalp cron would send
 * to the AI for a symbol right now (live TradingView + news context baked in). */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const symbolParam = (req.nextUrl.searchParams.get("symbol") || "XAUUSD").toUpperCase();
  const def = QUOTE_DEFINITIONS.find((d) => d.symbol === symbolParam);
  if (!def) return NextResponse.json({ error: "unknown_symbol" }, { status: 400 });

  let quote: QuoteRow;
  let quoteSource = "mock";
  try {
    const q = await resolveQuotes();
    const live = q.quotes.find((x) => x.symbol === def.symbol);
    if (live) {
      quote = {
        symbol: live.symbol,
        name: live.name,
        group: live.group,
        bid: live.bid,
        ask: live.ask,
        changePct: live.changePct,
      };
      quoteSource = q.source;
    } else {
      quote = { symbol: def.symbol, name: def.name, group: def.group, bid: def.mockMid, ask: def.mockMid, changePct: 0 };
    }
  } catch {
    quote = { symbol: def.symbol, name: def.name, group: def.group, bid: def.mockMid, ask: def.mockMid, changePct: 0 };
  }

  const [tvResult, newsResult, provider] = await Promise.all([
    getScalpingTechnicalContext(quote).catch(() => null),
    getAiNewsContext(def.symbol).catch(() => null),
    resolveAiProvider().catch(() => null),
  ]);

  const userPrompt = buildScalpingUserPrompt(quote, tvResult, newsResult, "vi");

  return NextResponse.json({
    symbol: def.symbol,
    quote,
    quoteSource,
    tvAvailable: tvResult !== null,
    newsRiskLevel: newsResult?.riskLevel ?? null,
    provider: provider
      ? {
          provider: provider.provider,
          model: provider.model,
          temperature: provider.supportsTemperature ? 0.2 : null,
          maxTokens: provider.maxTokens,
        }
      : null,
    systemPrompt: SCALPING_SYSTEM_PROMPT,
    userPrompt,
    generatedAt: new Date().toISOString(),
  });
}
