import { describe, expect, it } from "vitest";
import { parseMistakes, TRADE_MISTAKES } from "./mistakes";

describe("parseMistakes", () => {
  it("accepts an array of valid tags and keeps catalog order", () => {
    expect(parseMistakes(["OVERSIZED", "NO_STOP"])).toEqual(["NO_STOP", "OVERSIZED"]);
  });

  it("accepts a comma-separated string", () => {
    expect(parseMistakes("NO_STOP, CHASED ,REVENGE")).toEqual([
      "NO_STOP",
      "CHASED",
      "REVENGE",
    ]);
  });

  it("drops unknown tags", () => {
    expect(parseMistakes(["NO_STOP", "MADE_UP", "", "chased"])).toEqual(["NO_STOP"]);
  });

  it("de-duplicates", () => {
    expect(parseMistakes(["REVENGE", "REVENGE", "NO_STOP"])).toEqual(["NO_STOP", "REVENGE"]);
  });

  it("returns [] for non-array / non-string input", () => {
    expect(parseMistakes(null)).toEqual([]);
    expect(parseMistakes(undefined)).toEqual([]);
    expect(parseMistakes(42)).toEqual([]);
    expect(parseMistakes({})).toEqual([]);
  });

  it("never returns more than the full catalog", () => {
    const flooded = Array(50).fill("NO_STOP").concat(TRADE_MISTAKES);
    const result = parseMistakes(flooded);
    expect(result.length).toBeLessThanOrEqual(TRADE_MISTAKES.length);
    expect(new Set(result).size).toBe(result.length);
  });
});
