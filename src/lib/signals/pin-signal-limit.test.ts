import { describe, it, expect } from "vitest";
import { isAtPinLimit, MAX_PINS } from "./pin-signal-limit";

describe("isAtPinLimit", () => {
  it("returns false when below limit", () => {
    expect(isAtPinLimit(MAX_PINS - 1)).toBe(false);
  });

  it("returns true when exactly at limit", () => {
    expect(isAtPinLimit(MAX_PINS)).toBe(true);
  });

  it("returns true when over limit", () => {
    expect(isAtPinLimit(MAX_PINS + 1)).toBe(true);
  });
});
