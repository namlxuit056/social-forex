import { describe, expect, it } from "vitest";
import { isNegativeMood, parseMood } from "./mood";

describe("parseMood", () => {
  it("accepts the four known moods", () => {
    expect(parseMood("good")).toBe("good");
    expect(parseMood("ok")).toBe("ok");
    expect(parseMood("tired")).toBe("tired");
    expect(parseMood("stressed")).toBe("stressed");
  });

  it("rejects anything else", () => {
    expect(parseMood("happy")).toBeNull();
    expect(parseMood("")).toBeNull();
    expect(parseMood(null)).toBeNull();
    expect(parseMood(3)).toBeNull();
  });
});

describe("isNegativeMood", () => {
  it("is true only for tired / stressed", () => {
    expect(isNegativeMood("tired")).toBe(true);
    expect(isNegativeMood("stressed")).toBe(true);
    expect(isNegativeMood("good")).toBe(false);
    expect(isNegativeMood("ok")).toBe(false);
    expect(isNegativeMood(null)).toBe(false);
    expect(isNegativeMood(undefined)).toBe(false);
  });
});
