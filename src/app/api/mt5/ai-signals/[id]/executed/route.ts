import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hashMt5BridgeToken, MT5_BRIDGE_TOKEN_PREFIX } from "@/lib/mt5-bridge";
import { prisma } from "@/lib/prisma";

const executedSchema = z.object({
  mt5Ticket: z.union([z.string(), z.number()]).transform(String),
});

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.toLowerCase().startsWith("bearer ")) return null;
  return authorization.slice("bearer ".length).trim();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = bearerToken(request);
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = executedSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { id } = await params;

  const proposal = await prisma.aiTradeProposal.findUnique({
    where: { id },
    select: { id: true, connectionId: true, status: true },
  });

  if (
    !proposal ||
    proposal.connectionId !== connection.id ||
    proposal.status !== "CONFIRMED"
  ) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await prisma.aiTradeProposal.update({
    where: { id },
    data: {
      status: "EXECUTED",
      executedAt: new Date(),
      mt5Ticket: parsed.data.mt5Ticket,
    },
  });

  return NextResponse.json({ ok: true });
}
