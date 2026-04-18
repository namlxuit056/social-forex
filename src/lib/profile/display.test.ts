import { describe, expect, it } from "vitest";
import {
  getInitialsFromLabel,
  getPublicDisplayLabel,
  getSignalsAuthorQuery,
} from "./display";

describe("getPublicDisplayLabel", () => {
  it("prefers trimmed name", () => {
    expect(getPublicDisplayLabel("  Ana  ", "a@b.com")).toBe("Ana");
  });

  it("uses email local part when no name", () => {
    expect(getPublicDisplayLabel(null, "trader@example.com")).toBe("trader");
  });

  it("falls back to Trader", () => {
    expect(getPublicDisplayLabel(null, null)).toBe("Trader");
  });
});

describe("getSignalsAuthorQuery", () => {
  it("returns trimmed name", () => {
    expect(getSignalsAuthorQuery("  Ana ")).toBe("Ana");
  });

  it("returns empty when no name", () => {
    expect(getSignalsAuthorQuery(null)).toBe("");
  });
});

describe("getInitialsFromLabel", () => {
  it("uses two words", () => {
    expect(getInitialsFromLabel("Ana Costa")).toBe("AC");
  });

  it("uses first two chars for single token", () => {
    expect(getInitialsFromLabel("Trader")).toBe("TR");
  });
});
