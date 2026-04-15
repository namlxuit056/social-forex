import { endOfDay, startOfDay, subDays } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

/** Default calendar for VN traders when `tz=vn`. */
export const SIGNAL_LIST_DATE_TZ = "Asia/Ho_Chi_Minh";

export type SignalDatePeriod = "all" | "today" | "week";

/**
 * Returns UTC bounds for `createdAt` filter, or `null` when `period === "all"`.
 * @param timeZone IANA zone (e.g. `Asia/Ho_Chi_Minh`, `UTC`).
 */
export function getCreatedAtRangeForPeriod(
  period: SignalDatePeriod,
  now: Date = new Date(),
  timeZone: string = SIGNAL_LIST_DATE_TZ,
): { gte: Date; lte: Date } | null {
  if (period === "all") return null;

  const zonedNow = toZonedTime(now, timeZone);

  if (period === "today") {
    const start = startOfDay(zonedNow);
    const end = endOfDay(zonedNow);
    return {
      gte: fromZonedTime(start, timeZone),
      lte: fromZonedTime(end, timeZone),
    };
  }

  const weekStart = startOfDay(subDays(zonedNow, 6));
  const end = endOfDay(zonedNow);
  return {
    gte: fromZonedTime(weekStart, timeZone),
    lte: fromZonedTime(end, timeZone),
  };
}
