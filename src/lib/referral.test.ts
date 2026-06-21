import { describe, it, expect } from "vitest";
import { generateReferralCode, getReferralLink } from "./referral";

describe("generateReferralCode", () => {
  it("returns 8 characters", () => {
    expect(generateReferralCode()).toHaveLength(8);
  });

  it("returns unique codes", () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateReferralCode()));
    expect(codes.size).toBe(100);
  });

  it("contains only valid characters", () => {
    const valid = /^[A-Z2-9]+$/;
    for (let i = 0; i < 50; i++) {
      expect(generateReferralCode()).toMatch(valid);
    }
  });
});

describe("getReferralLink", () => {
  it("returns URL with ref param", () => {
    const link = getReferralLink("ABC12345", "https://example.com");
    expect(link).toBe("https://example.com/?ref=ABC12345");
  });

  it("uses custom base URL", () => {
    const link = getReferralLink("XYZ99999", "https://myapp.com");
    expect(link).toContain("ref=XYZ99999");
  });
});
