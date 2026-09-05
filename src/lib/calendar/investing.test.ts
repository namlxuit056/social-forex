import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetInvestingCacheForTests,
  fetchInvestingCalendar,
  formatTvValue,
} from "./investing";

describe("formatTvValue", () => {
  it("returns undefined for null/undefined", () => {
    expect(formatTvValue(null)).toBeUndefined();
    expect(formatTvValue(undefined)).toBeUndefined();
  });

  it("formats a bare number with no unit/scale", () => {
    expect(formatTvValue(54.6)).toBe("54.6");
  });

  it("formats a percentage unit", () => {
    expect(formatTvValue(6.4, "%")).toBe("6.4%");
  });

  it("formats a percentage with a scale suffix", () => {
    expect(formatTvValue(6.4, "%", "K")).toBe("6.4K%");
  });

  it("formats a scale suffix with no unit", () => {
    expect(formatTvValue(7.271, undefined, "M")).toBe("7.271M");
  });

  it("prefixes a currency-symbol unit", () => {
    expect(formatTvValue(1.2, "$", "B")).toBe("$1.2B");
  });
});

describe("fetchInvestingCalendar", () => {
  beforeEach(() => {
    __resetInvestingCacheForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps TradingView events to CalendarEvent, dropping ones with no currency", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "ok",
        result: [
          {
            id: "396677",
            title: "ISM Manufacturing PMI",
            currency: "usd",
            actual: 54.6,
            previous: 55.6,
            forecast: 55.2,
            importance: 1,
            date: "2026-09-01T14:00:00.000Z",
          },
          {
            id: "999999",
            title: "G20 Meetings",
            currency: undefined,
            importance: 0,
            date: "2026-08-30T12:00:00.000Z",
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const events = await fetchInvestingCalendar();

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: "tv-396677",
      timeUtc: "2026-09-01T14:00:00.000Z",
      currency: "USD",
      title: "ISM Manufacturing PMI",
      impact: "high",
      actual: "54.6",
      previous: "55.6",
      forecast: "55.2",
    });

    const [, options] = fetchMock.mock.calls[0];
    expect((options.headers as Record<string, string>).Origin).toBe(
      "https://www.tradingview.com",
    );
  });

  it("throws on a non-ok HTTP response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403 }),
    );
    await expect(fetchInvestingCalendar()).rejects.toThrow(/403/);
  });

  it("throws when the response body has an unexpected shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: "error" }) }),
    );
    await expect(fetchInvestingCalendar()).rejects.toThrow(/unexpected response format/);
  });
});
