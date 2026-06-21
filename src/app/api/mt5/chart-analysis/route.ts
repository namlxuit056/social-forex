import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hashMt5BridgeToken, MT5_BRIDGE_TOKEN_PREFIX } from "@/lib/mt5-bridge";
import { prisma } from "@/lib/prisma";
import { analyzeMt5Chart } from "@/lib/ai/mt5-chart-analyze";
import { AiUnavailableError } from "@/lib/ai/suggest";
import { Prisma } from "@/generated/prisma/client";

const ohlcvSchema = z.object({
  time: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number().optional(),
});

const indicatorsSchema = z
  .object({
    rsi14: z.number().optional(),
    macd: z
      .object({
        macd: z.number(),
        signal: z.number(),
        histogram: z.number(),
      })
      .optional(),
    ema20: z.number().optional(),
    ema50: z.number().optional(),
    ema200: z.number().optional(),
    atr14: z.number().optional(),
    bbUpper: z.number().optional(),
    bbLower: z.number().optional(),
    stochK: z.number().optional(),
    stochD: z.number().optional(),
  })
  .optional();

const chartAnalysisSchema = z.object({
  symbol: z.string().max(40),
  timeframe: z.string().max(10),
  currentPrice: z.number().positive(),
  ohlcv: z.array(ohlcvSchema).max(100),
  indicators: indicatorsSchema,
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

  const parsed = chartAnalysisSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { symbol, timeframe, currentPrice, ohlcv, indicators } = parsed.data;

  let suggestion;
  try {
    suggestion = await analyzeMt5Chart({
      symbol,
      timeframe,
      currentPrice,
      ohlcv,
      indicators,
    });
  } catch (err) {
    if (err instanceof AiUnavailableError) {
      return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
    }
    throw err;
  }

  const proposal = await prisma.aiTradeProposal.create({
    data: {
      connectionId: connection.id,
      userId: connection.userId,
      symbol: symbol.toUpperCase(),
      timeframe,
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
    select: {
      id: true,
    },
  });

  return NextResponse.json({
    proposalId: proposal.id,
    direction: suggestion.direction,
    entry: suggestion.entry,
    stopLoss: suggestion.stopLoss,
    takeProfit: suggestion.takeProfit,
    confidence: suggestion.confidence,
    qualityScore: suggestion.qualityScore,
  });
}
