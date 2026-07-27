import { z } from "zod";

export const accountSchema = z.object({
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

export const zPrice = z.coerce.number().optional().nullable().transform((v) => (v == null || v === 0) ? null : v);

export const positionSchema = z.object({
  ticket: z.union([z.string(), z.number()]).transform(String),
  identifier: z.union([z.string(), z.number()]).optional().transform((v) => v == null ? undefined : String(v)),
  symbol: z.string().min(1).max(40),
  type: z.string().min(1).max(20),
  volume: z.coerce.number(),
  priceOpen: z.coerce.number(),
  priceCurrent: z.coerce.number().optional().nullable(),
  stopLoss: zPrice,
  takeProfit: zPrice,
  profit: z.coerce.number().optional().nullable(),
  swap: z.coerce.number().optional().nullable(),
  openedAt: z.string().optional().nullable(),
});

export const pendingOrderSchema = z.object({
  ticket: z.union([z.string(), z.number()]).transform(String),
  symbol: z.string().min(1).max(40),
  type: z.string().min(1).max(30),
  volume: z.coerce.number(),
  priceOpen: z.coerce.number(),
  stopLoss: zPrice,
  takeProfit: zPrice,
  openedAt: z.string().optional().nullable(),
});

// Realized exit deal from MT5 trade history (HistoryDealGetX) — reported in addition to
// `positions` so a closed position's final price/profit doesn't have to be reconstructed
// from the last-seen floating profit, which can be several seconds stale by the time the
// EA notices the position is gone.
export const closedDealSchema = z.object({
  positionId: z.union([z.string(), z.number()]).transform(String),
  price: z.coerce.number(),
  profit: z.coerce.number(),
  swap: z.coerce.number().optional().default(0),
  commission: z.coerce.number().optional().default(0),
  closedAt: z.string(),
});

export function directionFromMt5Type(type: string) {
  return type.toUpperCase().startsWith("BUY") ? "LONG" : "SHORT";
}

export type ClosedDealInfo = { price: number; profit: number; closedAt: Date };

// A position can be closed via multiple exit deals (partial closes finishing with a final
// close) — sum the realized profit across all of them and keep the latest deal's price/time
// as the position's effective close price/time.
export function aggregateClosedDeals(deals: z.infer<typeof closedDealSchema>[]): Map<string, ClosedDealInfo> {
  const byPosition = new Map<string, ClosedDealInfo & { latestMs: number }>();
  for (const deal of deals) {
    const closedAt = new Date(deal.closedAt);
    if (!Number.isFinite(closedAt.getTime())) continue;
    const dealProfit = deal.profit + deal.swap + deal.commission;
    const existing = byPosition.get(deal.positionId);
    if (!existing) {
      byPosition.set(deal.positionId, { price: deal.price, profit: dealProfit, closedAt, latestMs: closedAt.getTime() });
      continue;
    }
    existing.profit += dealProfit;
    if (closedAt.getTime() >= existing.latestMs) {
      existing.price = deal.price;
      existing.closedAt = closedAt;
      existing.latestMs = closedAt.getTime();
    }
  }
  return byPosition;
}
