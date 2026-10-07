import type { PlaceOrderType } from "@/actions/mt5-commands";

/**
 * Loại lệnh chờ để vào đúng giá entry của tín hiệu, so với giá thị trường hiện tại:
 * - LONG: entry dưới Ask → BUY_LIMIT (chờ giá hồi xuống), trên Ask → BUY_STOP (chờ breakout)
 * - SHORT: entry trên Bid → SELL_LIMIT (chờ giá hồi lên), dưới Bid → SELL_STOP
 * Trả null khi entry trùng giá hiện tại (nên vào lệnh thị trường) hoặc thiếu giá.
 */
export function pendingOrderTypeForSignal(
  direction: string,
  entry: number,
  quote: { bid: number; ask: number } | null,
): PlaceOrderType | null {
  if (!quote || !(entry > 0)) return null;
  if (direction === "LONG") {
    if (entry < quote.ask) return "BUY_LIMIT";
    if (entry > quote.ask) return "BUY_STOP";
    return null;
  }
  if (direction === "SHORT") {
    if (entry > quote.bid) return "SELL_LIMIT";
    if (entry < quote.bid) return "SELL_STOP";
    return null;
  }
  return null;
}

export function marketOrderTypeForSignal(direction: string): PlaceOrderType | null {
  return direction === "LONG" ? "BUY" : direction === "SHORT" ? "SELL" : null;
}
