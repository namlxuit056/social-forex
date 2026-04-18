import { describe, expect, it } from "vitest";
import {
  buildSignalOrderBy,
  buildSignalWhere,
  buildSignalsListHref,
  parseSignalListSearchParams,
} from "./signal-list-query";

describe("parseSignalListSearchParams", () => {
  it("defaults: period today, tz vn", () => {
    expect(parseSignalListSearchParams({})).toEqual({
      symbol: "",
      author: "",
      tier: "all",
      status: "all",
      period: "today",
      tz: "vn",
      sort: "newest",
      page: 1,
    });
  });

  it("parses period=all and tz=utc", () => {
    expect(
      parseSignalListSearchParams({
        period: "all",
        tz: "utc",
      }),
    ).toEqual(
      expect.objectContaining({
        period: "all",
        tz: "utc",
      }),
    );
  });

  it("parses filters", () => {
    expect(
      parseSignalListSearchParams({
        symbol: " eurusd ",
        author: " ann ",
        tier: "vip",
        status: "active",
        period: "week",
        tz: "utc",
        sort: "symbol",
        page: "2",
      }),
    ).toEqual({
      symbol: "eurusd",
      author: "ann",
      tier: "VIP",
      status: "ACTIVE",
      period: "week",
      tz: "utc",
      sort: "symbol",
      page: 2,
    });
  });

  it("rejects invalid page", () => {
    expect(parseSignalListSearchParams({ page: "0" }).page).toBe(1);
    expect(parseSignalListSearchParams({ page: "x" }).page).toBe(1);
  });

  it("ignores invalid status", () => {
    expect(parseSignalListSearchParams({ status: "nope" }).status).toBe(
      "all",
    );
  });
});

describe("buildSignalWhere", () => {
  it("returns empty object when no filters (today range still applies)", () => {
    const w = buildSignalWhere("", "all", "", "all", "today", "vn");
    expect(w).toEqual(
      expect.objectContaining({
        AND: expect.arrayContaining([
          expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        ]),
      }),
    );
  });

  it("no date clause when period all", () => {
    expect(buildSignalWhere("", "all", "", "all", "all", "vn")).toEqual({});
  });

  it("filters by symbol contains", () => {
    const w = buildSignalWhere("EUR", "all", "", "all", "all", "vn");
    expect(w).toEqual({
      AND: [{ symbol: { contains: "EUR", mode: "insensitive" } }],
    });
  });

  it("uses UTC for tz=utc", () => {
    const fixed = new Date("2025-06-15T12:00:00.000Z");
    const w = buildSignalWhere("", "all", "", "all", "today", "utc", fixed);
    expect(w).toEqual(
      expect.objectContaining({
        AND: expect.arrayContaining([
          expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        ]),
      }),
    );
  });
});

describe("buildSignalOrderBy", () => {
  it("orders newest by createdAt desc", () => {
    expect(buildSignalOrderBy("newest")).toEqual([
      { createdAt: "desc" },
      { id: "desc" },
    ]);
  });
});

describe("buildSignalsListHref", () => {
  it("omits defaults (today + vn implied)", () => {
    expect(
      buildSignalsListHref({
        pathname: "/signals",
        symbol: "",
        author: "",
        tier: "all",
        status: "all",
        period: "today",
        tz: "vn",
        sort: "newest",
        page: 1,
      }),
    ).toBe("/signals");
  });

  it("includes period=all and tz=utc", () => {
    const href = buildSignalsListHref({
      pathname: "/signals",
      period: "all",
      tz: "utc",
    });
    expect(href).toContain("period=all");
    expect(href).toContain("tz=utc");
  });

  it("includes week without today in name", () => {
    const href = buildSignalsListHref({
      pathname: "/signals",
      period: "week",
      tz: "vn",
    });
    expect(href).toContain("period=week");
    expect(href).not.toContain("tz=");
  });

  it("includes author query when set", () => {
    const href = buildSignalsListHref({
      pathname: "/signals",
      author: "Ana",
    });
    expect(href).toContain("author=Ana");
  });
});
