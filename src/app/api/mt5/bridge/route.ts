import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hashMt5BridgeToken, MT5_BRIDGE_TOKEN_PREFIX } from "@/lib/mt5-bridge";
import { prisma } from "@/lib/prisma";

const accountSchema = z.object({
  login: z.union([z.string(), z.number()]).transform(String),
  server: z.string().max(120).optional().nullable(),
  name: z.string().max(120).optional().nullable(),
  company: z.string().max(120).optional().nullable(),
  currency: z.string().max(16).optional().nullable(),
  balance: z.coerce.number(),
  equity: z.coerce.number(),
  margin: z.coerce.number().optional().default(0),
  freeMargin: z.coerce.number().optional().default(0),
  leverage: z.coerce.number().int().positive().optional().nullable(),
});

const positionSchema = z.object({
  ticket: z.union([z.string(), z.number()]).transform(String),
  symbol: z.string().min(1).max(40),
  type: z.string().min(1).max(20),
  volume: z.coerce.number(),
  priceOpen: z.coerce.number(),
  priceCurrent: z.coerce.number().optional().nullable(),
  stopLoss: z.coerce.number().optional().nullable(),
  takeProfit: z.coerce.number().optional().nullable(),
  profit: z.coerce.number().optional().nullable(),
  swap: z.coerce.number().optional().nullable(),
  openedAt: z.string().optional().nullable(),
});

const payloadSchema = z.object({
  token: z.string().optional(),
  account: accountSchema,
  positions: z.array(positionSchema).max(200).default([]),
  terminal: z
    .object({
      build: z.union([z.string(), z.number()]).optional(),
      name: z.string().optional(),
    })
    .optional(),
});

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.toLowerCase().startsWith("bearer ")) return null;
  return authorization.slice("bearer ".length).trim();
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const token = bearerToken(request) ?? parsed.data.token;
  if (!token || !token.startsWith(MT5_BRIDGE_TOKEN_PREFIX)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const tokenHash = hashMt5BridgeToken(token);
  const connection = await prisma.mt5Connection.findUnique({
    where: { tokenHash },
    select: { id: true, revokedAt: true },
  });

  if (!connection || connection.revokedAt) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { account, positions } = parsed.data;
  const now = new Date();

  await prisma.$transaction([
    prisma.mt5Connection.update({
      where: { id: connection.id },
      data: {
        lastSeenAt: now,
        lastError: null,
        accountLogin: account.login,
        accountServer: account.server,
        accountName: account.name,
        accountCompany: account.company,
        accountCurrency: account.currency,
        balance: account.balance,
        equity: account.equity,
        margin: account.margin,
        freeMargin: account.freeMargin,
        leverage: account.leverage,
        openPositions: positions.length,
      },
    }),
    prisma.mt5Snapshot.create({
      data: {
        connectionId: connection.id,
        account,
        positions,
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    receivedAt: now.toISOString(),
    positions: positions.length,
  });
}
