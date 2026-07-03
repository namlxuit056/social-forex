import { describe, it, expect } from "vitest";
import { getActiveTradingSessions, isForexMarketOpen } from "./trading-sessions";

describe("isForexMarketOpen", () => {
  it("is false all day Saturday", () => {
    expect(isForexMarketOpen(new Date("2026-07-04T12:00:00Z"))).toBe(false);
  });

  it("is false on Friday at/after 22:00 UTC", () => {
    expect(isForexMarketOpen(new Date("2026-07-03T22:00:00Z"))).toBe(false);
    expect(isForexMarketOpen(new Date("2026-07-03T21:59:00Z"))).toBe(true);
  });

  it("is false on Sunday before 22:00 UTC", () => {
    expect(isForexMarketOpen(new Date("2026-07-05T21:59:00Z"))).toBe(false);
  });

  it("is true on Sunday at/after 22:00 UTC", () => {
    expect(isForexMarketOpen(new Date("2026-07-05T22:00:00Z"))).toBe(true);
  });

  it("is true on a weekday", () => {
    expect(isForexMarketOpen(new Date("2026-07-01T12:00:00Z"))).toBe(true);
  });
});

describe("getActiveTradingSessions", () => {
  it("returns empty when the market is closed", () => {
    expect(getActiveTradingSessions(new Date("2026-07-04T12:00:00Z"))).toEqual([]);
  });

  it("returns Sydney + Tokyo overlap (02:00 UTC)", () => {
    const names = getActiveTradingSessions(new Date("2026-07-01T02:00:00Z")).map((s) => s.name);
    expect(names).toEqual(["sydney", "tokyo"]);
  });

  it("returns Tokyo only (07:30 UTC, after Sydney closes)", () => {
    const names = getActiveTradingSessions(new Date("2026-07-01T07:30:00Z")).map((s) => s.name);
    expect(names).toEqual(["tokyo"]);
  });

  it("returns Tokyo + London overlap (08:30 UTC)", () => {
    const names = getActiveTradingSessions(new Date("2026-07-01T08:30:00Z")).map((s) => s.name);
    expect(names).toEqual(["tokyo", "london"]);
  });

  it("returns London only (11:00 UTC)", () => {
    const names = getActiveTradingSessions(new Date("2026-07-01T11:00:00Z")).map((s) => s.name);
    expect(names).toEqual(["london"]);
  });

  it("returns London + New York overlap (14:00 UTC)", () => {
    const names = getActiveTradingSessions(new Date("2026-07-01T14:00:00Z")).map((s) => s.name);
    expect(names).toEqual(["london", "new-york"]);
  });

  it("returns New York only (19:00 UTC)", () => {
    const names = getActiveTradingSessions(new Date("2026-07-01T19:00:00Z")).map((s) => s.name);
    expect(names).toEqual(["new-york"]);
  });

  it("returns Sydney only (23:00 UTC)", () => {
    const names = getActiveTradingSessions(new Date("2026-07-01T23:00:00Z")).map((s) => s.name);
    expect(names).toEqual(["sydney"]);
  });
});
