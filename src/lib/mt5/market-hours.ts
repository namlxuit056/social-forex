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

export type ScheduledCloseTz = "utc" | "vn";

const VN_TIME_ZONE = "Asia/Ho_Chi_Minh";
// Positions page polls every 2s while open, but a user isn't guaranteed to
// have it open at the exact scheduled minute — this grace window is how long
// after the scheduled time the trigger still fires (matched against the same
// day, so it never fires twice).
const SCHEDULED_CLOSE_GRACE_MINUTES = 5;

export function isValidScheduledCloseTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function getWallClockMinutes(now: Date, tz: ScheduledCloseTz): number {
  if (tz === "utc") return now.getUTCHours() * 60 + now.getUTCMinutes();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: VN_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

export function isWithinScheduledCloseWindow(
  now: Date,
  timeHHmm: string,
  tz: ScheduledCloseTz,
): boolean {
  if (!isValidScheduledCloseTime(timeHHmm)) return false;
  const [hour, minute] = timeHHmm.split(":").map(Number);
  const scheduledMinutes = hour * 60 + minute;
  const nowMinutes = getWallClockMinutes(now, tz);
  const diff = (nowMinutes - scheduledMinutes + 1440) % 1440;
  return diff < SCHEDULED_CLOSE_GRACE_MINUTES;
}

export function getScheduledCloseDayKey(now: Date, tz: ScheduledCloseTz): string {
  if (tz === "utc") return now.toISOString().slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", { timeZone: VN_TIME_ZONE }).format(now);
}
