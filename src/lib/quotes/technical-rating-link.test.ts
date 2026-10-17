import { describe, expect, it } from "vitest";
import { SIGNAL_LINK_PARAM, technicalRatingSignalHref } from "./technical-rating-link";

describe("technicalRatingSignalHref", () => {
  it("encodes the dedupe key so colons survive the round trip", () => {
    const key = "tv-rating:XAUUSD:sell:123456";
    const href = technicalRatingSignalHref(key);
    expect(href.startsWith("/quotes/technical-rating?")).toBe(true);
    const params = new URL(href, "https://x.test").searchParams;
    expect(params.get(SIGNAL_LINK_PARAM)).toBe(key);
  });
});
