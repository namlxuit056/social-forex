const PRICE_SENSITIVE_TTL_MS = 20_000;

const PRICE_SENSITIVE_TYPES = new Set([
  "CLOSE_POSITION",
  "PARTIAL_CLOSE",
  "MODIFY_POSITION",
  "TRAIL_UPDATE",
  "CLOSE_ALL",
  "PLACE_BUY",
  "PLACE_SELL",
]);

export function commandExpiresAt(type: string, now: Date = new Date()): Date | null {
  if (!PRICE_SENSITIVE_TYPES.has(type)) return null;
  return new Date(now.getTime() + PRICE_SENSITIVE_TTL_MS);
}
