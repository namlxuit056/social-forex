export type TradingSessionName = "sydney" | "tokyo" | "london" | "new-york";

export type TradingSession = {
  name: TradingSessionName;
  label: string;
};

// Approximate session hours in UTC, ignoring regional DST shifts.
const SESSIONS: (TradingSession & { startHour: number; endHour: number })[] = [
  { name: "sydney", label: "Sydney", startHour: 22, endHour: 7 },
  { name: "tokyo", label: "Tokyo", startHour: 0, endHour: 9 },
  { name: "london", label: "London", startHour: 8, endHour: 17 },
  { name: "new-york", label: "New York", startHour: 13, endHour: 22 },
];

function isHourInRange(hour: number, startHour: number, endHour: number): boolean {
  if (startHour < endHour) return hour >= startHour && hour < endHour;
  return hour >= startHour || hour < endHour;
}

/** Forex trading week runs Sunday 22:00 UTC (Sydney open) to Friday 22:00 UTC (New York close). */
export function isForexMarketOpen(now: Date = new Date()): boolean {
  const day = now.getUTCDay();
  const hour = now.getUTCHours();
  if (day === 6) return false;
  if (day === 5 && hour >= 22) return false;
  if (day === 0 && hour < 22) return false;
  return true;
}

export function getActiveTradingSessions(now: Date = new Date()): TradingSession[] {
  if (!isForexMarketOpen(now)) return [];
  const hour = now.getUTCHours();
  return SESSIONS.filter((s) => isHourInRange(hour, s.startHour, s.endHour)).map(({ name, label }) => ({
    name,
    label,
  }));
}
