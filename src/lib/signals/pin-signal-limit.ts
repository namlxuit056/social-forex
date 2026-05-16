export const MAX_PINS = 6;

export function isAtPinLimit(count: number): boolean {
  return count >= MAX_PINS;
}
