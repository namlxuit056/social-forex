import { describe, it, expect } from "vitest";
import { slugify, randomSuffix } from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("strips diacritics", () => {
    expect(slugify("Tỷ giá ngoại tệ")).toBe("ty-gia-ngoai-te");
  });

  it("removes leading/trailing hyphens", () => {
    expect(slugify("--foo--")).toBe("foo");
  });

  it("collapses multiple separators", () => {
    expect(slugify("a   b!!!c")).toBe("a-b-c");
  });

  it("truncates to 72 chars", () => {
    const long = "a".repeat(100);
    expect(slugify(long).length).toBeLessThanOrEqual(72);
  });

  it('returns "thread" for empty input', () => {
    expect(slugify("")).toBe("thread");
    expect(slugify("---")).toBe("thread");
  });
});

describe("randomSuffix", () => {
  it("returns a string of correct length", () => {
    const s = randomSuffix(8);
    expect(typeof s).toBe("string");
    expect(s.length).toBeLessThanOrEqual(8);
    expect(s.length).toBeGreaterThan(0);
  });

  it("defaults to length 6", () => {
    const s = randomSuffix();
    expect(s.length).toBeLessThanOrEqual(6);
    expect(s.length).toBeGreaterThan(0);
  });
});
