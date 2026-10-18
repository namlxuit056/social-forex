/** One-off PayPal support payments on /support (USD). */
export const SUPPORT_PRESET_AMOUNTS = [3, 5, 10, 25] as const;
export const SUPPORT_MIN_AMOUNT = 1;
export const SUPPORT_MAX_AMOUNT = 1000;

/**
 * Normalises a user-entered amount to PayPal's "12.50" format, or null when it
 * is not a number between the min and max with at most two decimals.
 */
export function parseSupportAmount(input: unknown): string | null {
  const raw = typeof input === "number" ? String(input) : typeof input === "string" ? input.trim() : "";
  if (!/^\d+([.,]\d{1,2})?$/.test(raw)) return null;
  const value = Number(raw.replace(",", "."));
  if (!Number.isFinite(value) || value < SUPPORT_MIN_AMOUNT || value > SUPPORT_MAX_AMOUNT) {
    return null;
  }
  return value.toFixed(2);
}
