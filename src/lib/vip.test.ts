import { describe, it, expect } from "vitest";
import { isVipActive } from "./vip";

describe("isVipActive", () => {
  it("returns false for null", () => {
    expect(isVipActive(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isVipActive(undefined)).toBe(false);
  });

  it("returns true when vipUntil is in the future", () => {
    const future = new Date();
    future.setDate(future.getDate() + 7);
    expect(isVipActive(future)).toBe(true);
  });

  it("returns false when vipUntil is in the past", () => {
    const past = new Date();
    past.setDate(past.getDate() - 1);
    expect(isVipActive(past)).toBe(false);
  });

  it("returns false when vipUntil is exactly now (edge case)", () => {
    const now = new Date();
    expect(isVipActive(now)).toBe(false);
  });
});
