import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hashMt5BridgeToken, MT5_BRIDGE_TOKEN_PREFIX } from "@/lib/mt5-bridge";
import { prisma } from "@/lib/prisma";
import { analyzeTvChart } from "@/lib/ai/tv-chart-analyze";
import { AiUnavailableError } from "@/lib/ai/suggest";
import { Prisma } from "@/generated/prisma/client";

const tvAnalysisSchema = z.object({
  symbol: z.string().min(3).max(40),
  currentPrice: z.number().positive(),
});

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.toLowerCase().startsWith("bearer ")) return null;
  return authorization.slice("bearer ".length).trim();
}

export async function POST(request: NextRequest) {
  const token = bearerToken(request);
  if (!token || !token.startsWith(MT5_BRIDGE_TOKEN_PREFIX)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const tokenHash = hashMt5BridgeToken(token);
  const connection = await prisma.mt5Connection.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, revokedAt: true },
  });

  if (!connection || connection.revokedAt) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = tvAnalysisSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { symbol, currentPrice } = parsed.data;

  let result;
  try {
    result = await analyzeTvChart(symbol, currentPrice);
  } catch (err) {
    if (err instanceof AiUnavailableError) {
      return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    }
    if (err instanceof Error && err.message.includes("TradingView data not available")) {
      return NextResponse.json({ error: "tv_data_unavailable", symbol }, { status: 503 });
    }
    throw err;
  }

  const { suggestion, tvContext } = result;

  const proposal = await prisma.aiTradeProposal.create({
    data: {
      connectionId: connection.id,
      userId: connection.userId,
      symbol: symbol.toUpperCase(),
      timeframe: "TV_MULTI",
      direction: suggestion.direction,
      entry: suggestion.entry,
      stopLoss: suggestion.stopLoss ?? null,
      takeProfit: suggestion.takeProfit ?? null,
      confidence: suggestion.confidence ?? null,
      qualityScore: suggestion.qualityScore ?? null,
      reasoning: suggestion.reasoning,
      checklist: suggestion.tradeChecklist
        ? (JSON.parse(JSON.stringify(suggestion.tradeChecklist)) as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      keyLevels: suggestion.keyLevels
        ? (JSON.parse(JSON.stringify(suggestion.keyLevels)) as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      status: "PENDING_REVIEW",
    },
    select: { id: true },
  });

  return NextResponse.json({
    proposalId: proposal.id,
    direction: suggestion.direction,
    entry: suggestion.entry,
    stopLoss: suggestion.stopLoss,
    takeProfit: suggestion.takeProfit,
    confidence: suggestion.confidence,
    qualityScore: suggestion.qualityScore,
    tvSummary: tvContext.summary,
  });
}
