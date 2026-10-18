import { describe, expect, it } from "vitest";
import { parseSupportAmount } from "./support-amount";

describe("parseSupportAmount", () => {
  it("normalises valid amounts to two decimals", () => {
    expect(parseSupportAmount(5)).toBe("5.00");
    expect(parseSupportAmount("12.5")).toBe("12.50");
    expect(parseSupportAmount("7,25")).toBe("7.25");
    expect(parseSupportAmount(" 1000 ")).toBe("1000.00");
  });

  it("rejects out-of-range or malformed amounts", () => {
    expect(parseSupportAmount("0.99")).toBeNull();
    expect(parseSupportAmount("1000.01")).toBeNull();
    expect(parseSupportAmount("-5")).toBeNull();
    expect(parseSupportAmount("5.123")).toBeNull();
    expect(parseSupportAmount("abc")).toBeNull();
    expect(parseSupportAmount("1e3")).toBeNull();
    expect(parseSupportAmount(null)).toBeNull();
  });
});
