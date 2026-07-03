const FRIDAY = 5;
const WINDOW_START_HOUR = 20;
const WINDOW_END_HOUR = 21;

export function isWithinWeekendAutoCloseWindow(now: Date = new Date()): boolean {
  if (now.getUTCDay() !== FRIDAY) return false;
  const hour = now.getUTCHours();
  return hour >= WINDOW_START_HOUR && hour < WINDOW_END_HOUR;
}

export function getAutoCloseWeekKey(now: Date = new Date()): string {
  const daysSinceFriday = (now.getUTCDay() - FRIDAY + 7) % 7;
  const friday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceFriday),
  );
  return friday.toISOString().slice(0, 10);
}
