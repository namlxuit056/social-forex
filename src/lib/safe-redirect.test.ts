import { describe, expect, it } from "vitest";
import { safeCallbackPath, safeLocalizedCallbackPath } from "./safe-redirect";

describe("safeCallbackPath", () => {
  it("keeps internal callback paths", () => {
    expect(safeCallbackPath("/dashboard")).toBe("/dashboard");
  });

  it("rejects external callback paths", () => {
    expect(safeCallbackPath("https://example.com")).toBe("/dashboard");
    expect(safeCallbackPath("//example.com")).toBe("/dashboard");
  });
});

describe("safeLocalizedCallbackPath", () => {
  it("removes locale prefixes before using the next-intl router", () => {
    expect(safeLocalizedCallbackPath("/en/dashboard")).toBe("/dashboard");
    expect(safeLocalizedCallbackPath("/vi/profile")).toBe("/profile");
  });

  it("maps a locale root callback to the app root", () => {
    expect(safeLocalizedCallbackPath("/en")).toBe("/");
    expect(safeLocalizedCallbackPath("/vi")).toBe("/");
  });

  it("keeps unprefixed internal paths", () => {
    expect(safeLocalizedCallbackPath("/signals")).toBe("/signals");
  });
});
