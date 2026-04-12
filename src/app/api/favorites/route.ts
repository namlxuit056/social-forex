import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { QUOTE_BY_SYMBOL } from "@/lib/quotes/definitions";

const MAX_FAVORITES = 20;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ favorites: [] });
  }

  const rows = await prisma.userFavoriteSymbol.findMany({
    where: { userId: session.user.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({
    favorites: rows.map((r) => r.symbol),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { symbol?: string };
  const symbol = body.symbol?.toUpperCase();

  if (!symbol || !QUOTE_BY_SYMBOL[symbol]) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  const count = await prisma.userFavoriteSymbol.count({
    where: { userId: session.user.id },
  });

  if (count >= MAX_FAVORITES) {
    return NextResponse.json(
      { error: `Maximum ${MAX_FAVORITES} favorites` },
      { status: 422 },
    );
  }

  await prisma.userFavoriteSymbol.upsert({
    where: {
      userId_symbol: { userId: session.user.id, symbol },
    },
    create: {
      userId: session.user.id,
      symbol,
      sortOrder: count,
    },
    update: {},
  });

  return NextResponse.json({ ok: true, symbol });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { symbol?: string };
  const symbol = body.symbol?.toUpperCase();

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  await prisma.userFavoriteSymbol.deleteMany({
    where: { userId: session.user.id, symbol },
  });

  return NextResponse.json({ ok: true, symbol });
}
