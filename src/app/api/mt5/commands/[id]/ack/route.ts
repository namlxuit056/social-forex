import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hashMt5BridgeToken, MT5_BRIDGE_TOKEN_PREFIX } from "@/lib/mt5-bridge";
import { prisma } from "@/lib/prisma";

function bearerToken(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice("bearer ".length).trim();
}

const ackSchema = z.object({
  success: z.boolean(),
  errorMsg: z.string().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = bearerToken(request);
  if (!token?.startsWith(MT5_BRIDGE_TOKEN_PREFIX)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const tokenHash = hashMt5BridgeToken(token);
  const connection = await prisma.mt5Connection.findFirst({
    where: { tokenHash, revokedAt: null },
    select: { id: true },
  });

  if (!connection) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = ackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const now = new Date();
  await prisma.mt5Command.updateMany({
    where: { id, connectionId: connection.id },
    data: {
      status: parsed.data.success ? "DONE" : "ERROR",
      errorMsg: parsed.data.errorMsg ?? null,
      doneAt: now,
    },
  });

  return NextResponse.json({ ok: true });
}
