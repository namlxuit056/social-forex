const SUNDAY = 0;
const FRIDAY = 5;
const SATURDAY = 6;
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

/**
 * Mon–Thu only — Friday's end-of-day window is covered by the weekend
 * auto-close instead, so the two features never both fire on the same day.
 */
export function isWithinEndOfDayAutoCloseWindow(now: Date = new Date()): boolean {
  const day = now.getUTCDay();
  if (day === SUNDAY || day === FRIDAY || day === SATURDAY) return false;
  const hour = now.getUTCHours();
  return hour >= WINDOW_START_HOUR && hour < WINDOW_END_HOUR;
}

export function getAutoCloseDayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
