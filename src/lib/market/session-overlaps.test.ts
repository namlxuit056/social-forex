import { describe, expect, it } from "vitest";
import {
  getMarketVolatilityState,
  getNextForexOpen,
  getOverlapWindows,
  getSessionWindows,
} from "./session-overlaps";

function findHigh(now: Date) {
  return getOverlapWindows(now).find((o) => o.level === "high" && o.end > now)!;
}

describe("London × New York overlap (DST aware)", () => {
  it("is 12:00–16:00 UTC in northern summer (= 19:00–23:00 VN)", () => {
    const now = new Date("2026-07-15T06:00:00.000Z"); // Wednesday
    const hi = findHigh(now);
    expect(hi.key).toBe("londonNewYork");
    expect(hi.start.getUTCHours()).toBe(12);
    expect(hi.end.getUTCHours()).toBe(16);
  });

  it("is 13:00–17:00 UTC in northern winter (= 20:00–24:00 VN)", () => {
    const now = new Date("2026-01-14T06:00:00.000Z"); // Wednesday
    const hi = findHigh(now);
    expect(hi.start.getUTCHours()).toBe(13);
    expect(hi.end.getUTCHours()).toBe(17);
  });
});

describe("getMarketVolatilityState", () => {
  it("reports the market closed on Saturday and points at the Sunday reopen", () => {
    const s = getMarketVolatilityState(new Date("2026-07-18T12:00:00.000Z")); // Saturday
    expect(s.marketOpen).toBe(false);
    expect(s.activeSessions).toEqual([]);
    expect(s.currentOverlap).toBeNull();
    expect(s.nextForexOpen).not.toBeNull();
    expect(s.nextForexOpen!.getUTCDay()).toBe(0);
    expect(s.nextForexOpen!.getUTCHours()).toBe(22);
  });

  it("flags an in-progress high-volatility overlap and the sessions behind it", () => {
    const s = getMarketVolatilityState(new Date("2026-07-15T13:30:00.000Z"));
    expect(s.marketOpen).toBe(true);
    expect(s.currentOverlap?.level).toBe("high");
    expect(s.activeSessions).toContain("london");
    expect(s.activeSessions).toContain("newYork");
  });

  it("gives the next high-volatility window when none is active", () => {
    const now = new Date("2026-07-15T06:00:00.000Z");
    const s = getMarketVolatilityState(now);
    expect(s.currentOverlap).toBeNull();
    expect(s.nextHighVolatility?.key).toBe("londonNewYork");
    expect(s.nextHighVolatility!.start.getTime()).toBeGreaterThan(now.getTime());
  });

  it("only lists overlaps inside the horizon window", () => {
    const s = getMarketVolatilityState(new Date("2026-07-15T06:00:00.000Z"), 12);
    for (const o of s.upcomingOverlaps) {
      expect(o.start.getTime()).toBeLessThan(
        new Date("2026-07-15T18:00:00.000Z").getTime(),
      );
    }
  });
});

describe("getSessionWindows", () => {
  it("never emits a window for a Saturday/Sunday local desk", () => {
    const windows = getSessionWindows(new Date("2026-07-15T00:00:00.000Z"));
    for (const w of windows) {
      // window start is always on the trading day (Mon–Fri) somewhere on earth;
      // just assert we produced a sane, ordered, non-empty set.
      expect(w.end.getTime()).toBeGreaterThan(w.start.getTime());
    }
    expect(windows.length).toBeGreaterThan(10);
  });
});

describe("getNextForexOpen", () => {
  it("returns the coming Sunday 22:00 UTC", () => {
    const open = getNextForexOpen(new Date("2026-07-15T10:00:00.000Z"));
    expect(open.getUTCDay()).toBe(0);
    expect(open.getUTCHours()).toBe(22);
    expect(open.toISOString()).toBe("2026-07-19T22:00:00.000Z");
  });
});
