import { describe, expect, it } from "vitest";
import { buildMonthGrid } from "./calendar-heatmap";

describe("buildMonthGrid", () => {
  it("pads leading/trailing cells and keeps rows as multiples of 7", () => {
    // Aug 2026 starts on a Saturday (weekday 6) and has 31 days
    const weeks = buildMonthGrid([], 2026, 7);
    const flat = weeks.flat();
    expect(flat.length % 7).toBe(0);
    expect(flat[0].date).toBeNull();
    expect(flat[6]?.date?.getDate()).toBe(1);
    const realDays = flat.filter((c) => c.date !== null);
    expect(realDays).toHaveLength(31);
    expect(realDays[0].date?.getMonth()).toBe(7);
    expect(realDays[realDays.length - 1].date?.getDate()).toBe(31);
  });

  it("buckets trade pnl into the day it closed", () => {
    const weeks = buildMonthGrid(
      [
        { result: "WIN", pnl: 100, openedAt: "2026-08-02T10:00:00.000Z", closedAt: "2026-08-02T12:00:00.000Z" },
        { result: "LOSS", pnl: -40, openedAt: "2026-08-02T13:00:00.000Z", closedAt: "2026-08-02T14:00:00.000Z" },
        { result: "PENDING", pnl: null, openedAt: "2026-08-03T09:00:00.000Z", closedAt: null },
      ],
      2026,
      7,
    );
    const day2 = weeks.flat().find((c) => c.date?.getDate() === 2 && c.date?.getMonth() === 7);
    expect(day2?.trades).toBe(2);
    expect(day2?.wins).toBe(1);
    expect(day2?.losses).toBe(1);
    expect(day2?.pnl).toBe(60);

    const day3 = weeks.flat().find((c) => c.date?.getDate() === 3 && c.date?.getMonth() === 7);
    expect(day3?.trades).toBe(0);
  });

  it("falls back to openedAt when closedAt is missing", () => {
    const weeks = buildMonthGrid(
      [{ result: "WIN", pnl: 30, openedAt: "2026-08-15T00:00:00.000Z", closedAt: null }],
      2026,
      7,
    );
    const day15 = weeks.flat().find((c) => c.date?.getDate() === 15);
    expect(day15?.pnl).toBe(30);
  });
});
