import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidateLocalizedPath } from "@/lib/revalidate-locales";

export const runtime = "nodejs";

const reportSchema = z.object({
  token: z.string().min(1),
  signalId: z.string().min(1),
  action: z.enum(["OPENED", "CLOSED"]),
  ticket: z.string().optional(),
  symbol: z.string().optional(),
  direction: z.enum(["BUY", "SELL"]).optional(),
  volume: z.number().optional(),
  openPrice: z.number().optional(),
  closePrice: z.number().optional(),
  profit: z.number().optional(),
  status: z.enum(["WIN", "LOSS", "BREAKEVEN"]).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const copyTrade = await prisma.copyTrade.findUnique({
    where: { token: parsed.data.token },
    select: { id: true, followerId: true, isActive: true },
  });

  if (!copyTrade || !copyTrade.isActive) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 404 });
  }

  if (parsed.data.action === "OPENED") {
    // Real copy activity — the follower's EA just opened a position from this
    // subscription. Feeds the "last copied N days ago" social proof.
    await prisma.copyTrade.update({
      where: { id: copyTrade.id },
      data: { lastCopiedAt: new Date() },
    });
  }

  if (parsed.data.action === "CLOSED" && parsed.data.status) {
    const pnl = parsed.data.profit ?? 0;
    const result = parsed.data.status === "WIN" ? "WIN" : parsed.data.status === "LOSS" ? "LOSS" : "BREAKEVEN";

    await prisma.tradeJournal.create({
      data: {
        userId: copyTrade.followerId,
        symbol: parsed.data.symbol ?? "",
        direction: parsed.data.direction === "BUY" ? "LONG" : "SHORT",
        entry: parsed.data.openPrice ?? 0,
        exitPrice: parsed.data.closePrice,
        lotSize: parsed.data.volume,
        result,
        pnl,
        notes: `Auto-copied from signal ${parsed.data.signalId}`,
        copiedFromSignalId: parsed.data.signalId,
        closedAt: new Date(),
      },
    });

    revalidateLocalizedPath("/journal", "page");
  }

  return NextResponse.json({ ok: true });
}
