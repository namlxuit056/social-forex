import { isForexMarketOpen } from "@/lib/mt5/trading-sessions";

// The four FX sessions and when the big banks in each centre are actually at their
// desks, expressed as *local wall-clock* hours in that centre's own timezone. UTC
// times are derived per-date so London/New York shift correctly across DST — which
// is why the London×New York overlap lands at 19:00–23:00 VN in summer and
// 20:00–24:00 VN in winter, matching how it is usually taught.

export type TradingSessionName = "sydney" | "tokyo" | "london" | "newYork";

type SessionDef = {
  name: TradingSessionName;
  tz: string;
  openHour: number;
  closeHour: number;
};

const SESSION_DEFS: SessionDef[] = [
  { name: "sydney", tz: "Australia/Sydney", openHour: 7, closeHour: 16 },
  { name: "tokyo", tz: "Asia/Tokyo", openHour: 9, closeHour: 18 },
  { name: "london", tz: "Europe/London", openHour: 8, closeHour: 17 },
  { name: "newYork", tz: "America/New_York", openHour: 8, closeHour: 17 },
];

const SESSION_ORDER = SESSION_DEFS.map((d) => d.name);

export type OverlapKey = "sydneyTokyo" | "tokyoLondon" | "londonNewYork";
export type VolatilityLevel = "high" | "medium" | "low";

const OVERLAP_DEFS: {
  key: OverlapKey;
  a: TradingSessionName;
  b: TradingSessionName;
  level: VolatilityLevel;
}[] = [
  { key: "londonNewYork", a: "london", b: "newYork", level: "high" },
  { key: "tokyoLondon", a: "tokyo", b: "london", level: "medium" },
  { key: "sydneyTokyo", a: "sydney", b: "tokyo", level: "low" },
];

type Ymd = { y: number; m: number; d: number };

function localYmd(tz: string, at: Date): Ymd {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(at)
    .split("-")
    .map(Number);
  return { y, m, d };
}

function addDays(ymd: Ymd, k: number): Ymd {
  const t = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d + k));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

function dayOfWeek(ymd: Ymd): number {
  return new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d)).getUTCDay();
}

// Offset (ms) to add to a UTC instant so the resulting fields read as `tz` local time.
function tzOffsetMs(tz: string, at: Date): number {
  const f: Record<string, number> = {};
  for (const part of new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at)) {
    if (part.type !== "literal") f[part.type] = Number(part.value);
  }
  const asUtc = Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute, f.second);
  return asUtc - at.getTime();
}

// UTC instant of a given local wall-clock hour on a given local calendar day.
function wallTimeToUtc(tz: string, day: Ymd, hour: number): Date {
  const naive = Date.UTC(day.y, day.m - 1, day.d, hour);
  let ms = naive - tzOffsetMs(tz, new Date(naive));
  const recheck = naive - tzOffsetMs(tz, new Date(ms));
  if (recheck !== ms) ms = recheck;
  return new Date(ms);
}

export type SessionWindow = { name: TradingSessionName; start: Date; end: Date };

export function getSessionWindows(
  now: Date,
  daysBack = 2,
  daysForward = 7,
): SessionWindow[] {
  const windows: SessionWindow[] = [];
  for (const def of SESSION_DEFS) {
    const base = localYmd(def.tz, now);
    for (let k = -daysBack; k <= daysForward; k++) {
      const day = addDays(base, k);
      const dow = dayOfWeek(day);
      if (dow === 0 || dow === 6) continue; // no Saturday/Sunday desk in that centre
      windows.push({
        name: def.name,
        start: wallTimeToUtc(def.tz, day, def.openHour),
        end: wallTimeToUtc(def.tz, day, def.closeHour),
      });
    }
  }
  return windows.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export type OverlapWindow = {
  key: OverlapKey;
  level: VolatilityLevel;
  start: Date;
  end: Date;
};

export function getOverlapWindows(now: Date): OverlapWindow[] {
  const sessions = getSessionWindows(now);
  const out: OverlapWindow[] = [];
  for (const od of OVERLAP_DEFS) {
    const as = sessions.filter((s) => s.name === od.a);
    const bs = sessions.filter((s) => s.name === od.b);
    for (const wa of as) {
      for (const wb of bs) {
        const start = Math.max(wa.start.getTime(), wb.start.getTime());
        const end = Math.min(wa.end.getTime(), wb.end.getTime());
        if (end > start) {
          out.push({ key: od.key, level: od.level, start: new Date(start), end: new Date(end) });
        }
      }
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Next Sunday 22:00 UTC — when the FX week reopens (mirrors isForexMarketOpen). */
export function getNextForexOpen(now: Date): Date {
  for (let i = 0; i <= 8; i++) {
    const cand = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i, 22, 0, 0),
    );
    if (cand.getUTCDay() === 0 && cand.getTime() > now.getTime()) return cand;
  }
  return now;
}

export type MarketVolatilityState = {
  marketOpen: boolean;
  nextForexOpen: Date | null;
  activeSessions: TradingSessionName[];
  currentOverlap: OverlapWindow | null;
  /** Next (or in-progress) London×New York window — the countdown target. */
  nextHighVolatility: OverlapWindow | null;
  /** Every overlap starting within the next `horizonHours`, for the reference list. */
  upcomingOverlaps: OverlapWindow[];
};

export function getMarketVolatilityState(
  now: Date = new Date(),
  horizonHours = 36,
): MarketVolatilityState {
  const marketOpen = isForexMarketOpen(now);
  const nowMs = now.getTime();

  const sessions = getSessionWindows(now);
  const activeSessions = marketOpen
    ? [
        ...new Set(
          sessions
            .filter((s) => s.start.getTime() <= nowMs && nowMs < s.end.getTime())
            .map((s) => s.name),
        ),
      ].sort((a, b) => SESSION_ORDER.indexOf(a) - SESSION_ORDER.indexOf(b))
    : [];

  const overlaps = getOverlapWindows(now);
  const currentOverlap = marketOpen
    ? (overlaps.find((o) => o.start.getTime() <= nowMs && nowMs < o.end.getTime()) ?? null)
    : null;
  const nextHighVolatility =
    overlaps.find((o) => o.level === "high" && o.end.getTime() > nowMs) ?? null;

  const horizon = nowMs + horizonHours * 3_600_000;
  const upcomingOverlaps = overlaps.filter(
    (o) => o.end.getTime() > nowMs && o.start.getTime() < horizon,
  );

  return {
    marketOpen,
    nextForexOpen: marketOpen ? null : getNextForexOpen(now),
    activeSessions,
    currentOverlap,
    nextHighVolatility,
    upcomingOverlaps,
  };
}
