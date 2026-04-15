import { describe, expect, it } from "vitest";
import {
  getCreatedAtRangeForPeriod,
  SIGNAL_LIST_DATE_TZ,
} from "./signal-list-date-range";

describe("getCreatedAtRangeForPeriod", () => {
  it("returns null for all", () => {
    expect(getCreatedAtRangeForPeriod("all", new Date())).toBeNull();
  });

  it("returns same-day bounds in Vietnam for a fixed UTC instant", () => {
    const now = new Date("2025-06-15T12:00:00.000Z");
    const r = getCreatedAtRangeForPeriod("today", now, SIGNAL_LIST_DATE_TZ);
    expect(r).not.toBeNull();
    if (!r) return;
    expect(r.gte.getTime()).toBeLessThanOrEqual(r.lte.getTime());
  });

  it("accepts UTC timezone", () => {
    const now = new Date("2025-06-15T12:00:00.000Z");
    const r = getCreatedAtRangeForPeriod("today", now, "UTC");
    expect(r).not.toBeNull();
    if (!r) return;
    expect(r.gte.getTime()).toBeLessThanOrEqual(r.lte.getTime());
  });

  it("week range spans seven calendar days in zone", () => {
    const now = new Date("2025-06-15T12:00:00.000Z");
    const r = getCreatedAtRangeForPeriod("week", now, SIGNAL_LIST_DATE_TZ);
    expect(r).not.toBeNull();
    if (!r) return;
    expect(r.gte.getTime()).toBeLessThan(r.lte.getTime());
  });
});
