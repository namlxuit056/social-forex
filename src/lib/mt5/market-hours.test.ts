import { describe, it, expect } from "vitest";
import { isWithinWeekendAutoCloseWindow, getAutoCloseWeekKey } from "./market-hours";

describe("isWithinWeekendAutoCloseWindow", () => {
  it("is false just before the window (Friday 19:59 UTC)", () => {
    expect(isWithinWeekendAutoCloseWindow(new Date("2026-07-03T19:59:00Z"))).toBe(false);
  });

  it("is true at the start of the window (Friday 20:00 UTC)", () => {
    expect(isWithinWeekendAutoCloseWindow(new Date("2026-07-03T20:00:00Z"))).toBe(true);
  });

  it("is true just before close (Friday 20:59 UTC)", () => {
    expect(isWithinWeekendAutoCloseWindow(new Date("2026-07-03T20:59:00Z"))).toBe(true);
  });

  it("is false at close (Friday 21:00 UTC)", () => {
    expect(isWithinWeekendAutoCloseWindow(new Date("2026-07-03T21:00:00Z"))).toBe(false);
  });

  it("is false on other days of the week", () => {
    expect(isWithinWeekendAutoCloseWindow(new Date("2026-07-02T20:30:00Z"))).toBe(false);
    expect(isWithinWeekendAutoCloseWindow(new Date("2026-07-04T20:30:00Z"))).toBe(false);
  });
});

describe("getAutoCloseWeekKey", () => {
  it("returns the same Friday's date when now is that Friday", () => {
    expect(getAutoCloseWeekKey(new Date("2026-07-03T20:30:00Z"))).toBe("2026-07-03");
  });

  it("returns the most recent Friday when now is later in the weekend", () => {
    expect(getAutoCloseWeekKey(new Date("2026-07-04T10:00:00Z"))).toBe("2026-07-03");
    expect(getAutoCloseWeekKey(new Date("2026-07-05T10:00:00Z"))).toBe("2026-07-03");
  });

  it("returns the most recent past Friday when now is earlier in the following week", () => {
    expect(getAutoCloseWeekKey(new Date("2026-06-29T10:00:00Z"))).toBe("2026-06-26");
  });
});
