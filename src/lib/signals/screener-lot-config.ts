import { prisma } from "@/lib/prisma";

// Sentinel row symbol for the fallback lot size used by any symbol without its own row.
export const SCREENER_LOT_DEFAULT_SYMBOL = "DEFAULT";

// Used only if the DEFAULT row itself hasn't been configured yet.
const HARD_FALLBACK_LOT = 0.01;

export type ScreenerLotRow = {
  id: string;
  symbol: string;
  lotSize: number;
};

export async function listScreenerLotConfig(): Promise<ScreenerLotRow[]> {
  return prisma.screenerLotConfig.findMany({
    orderBy: [{ symbol: "asc" }],
    select: { id: true, symbol: true, lotSize: true },
  });
}

/** Resolves the lot size to use for an auto-fired screener signal: the symbol's own
 * row if configured, otherwise the DEFAULT row, otherwise a hardcoded safety fallback. */
export async function resolveScreenerLotSize(symbol: string): Promise<number> {
  const rows = await prisma.screenerLotConfig.findMany({
    where: { symbol: { in: [symbol.toUpperCase(), SCREENER_LOT_DEFAULT_SYMBOL] } },
    select: { symbol: true, lotSize: true },
  });

  const exact = rows.find((r) => r.symbol === symbol.toUpperCase());
  if (exact) return exact.lotSize;

  const fallback = rows.find((r) => r.symbol === SCREENER_LOT_DEFAULT_SYMBOL);
  return fallback?.lotSize ?? HARD_FALLBACK_LOT;
}
