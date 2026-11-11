import { describe, expect, it } from "vitest";
import { isEligibleExnessBridge, isExnessAccount, isExnessDemoServer } from "./exness-bonus";

const now = new Date("2026-11-11T00:00:00Z");
const base = {
  revokedAt: null,
  lastSeenAt: new Date("2026-11-10T00:00:00Z"),
  accountLogin: "12345678",
  accountServer: "Exness-MT5Real8",
  accountCompany: "Exness Technologies Ltd",
};

describe("exness bonus eligibility", () => {
  it("detects Exness by company or server", () => {
    expect(isExnessAccount({ accountCompany: "Exness (SC) Ltd", accountServer: null })).toBe(true);
    expect(isExnessAccount({ accountCompany: null, accountServer: "Exness-MT5Real" })).toBe(true);
    expect(isExnessAccount({ accountCompany: "IC Markets", accountServer: "ICMarkets-Live" })).toBe(false);
  });

  it("accepts a fresh, live Exness bridge", () => {
    expect(isEligibleExnessBridge(base, now)).toBe(true);
  });

  it("rejects revoked, stale, missing login or non-Exness bridges", () => {
    expect(isEligibleExnessBridge({ ...base, revokedAt: now }, now)).toBe(false);
    expect(isEligibleExnessBridge({ ...base, lastSeenAt: null }, now)).toBe(false);
    expect(isEligibleExnessBridge({ ...base, lastSeenAt: new Date("2026-10-01T00:00:00Z") }, now)).toBe(false);
    expect(isEligibleExnessBridge({ ...base, accountLogin: null }, now)).toBe(false);
    expect(isEligibleExnessBridge({ ...base, accountCompany: "XM", accountServer: "XM-Real" }, now)).toBe(false);
  });

  it("flags demo servers", () => {
    expect(isExnessDemoServer("Exness-MT5Trial7")).toBe(true);
    expect(isExnessDemoServer("Exness-MT5Real8")).toBe(false);
    expect(isExnessDemoServer(null)).toBe(false);
  });
});
