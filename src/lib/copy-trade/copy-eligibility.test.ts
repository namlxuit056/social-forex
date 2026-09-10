import { describe, expect, it } from "vitest";
import {
  COPY_OPEN_GRACE_MS,
  copyActiveOpenSince,
  isCopySignalEligible,
} from "./copy-eligibility";

const NOW = new Date("2026-09-10T12:00:00.000Z");
const SUBSCRIBED = new Date("2026-01-01T00:00:00.000Z");

function ago(ms: number): Date {
  return new Date(NOW.getTime() - ms);
}

describe("isCopySignalEligible", () => {
  it("serves a freshly opened ACTIVE signal", () => {
    const signal = { status: "ACTIVE", createdAt: ago(60_000), closedAt: null };
    expect(isCopySignalEligible(signal, SUBSCRIBED, NOW)).toBe(true);
  });

  it("drops an ACTIVE signal the provider opened hours ago", () => {
    const signal = { status: "ACTIVE", createdAt: ago(3 * 60 * 60 * 1000), closedAt: null };
    expect(isCopySignalEligible(signal, SUBSCRIBED, NOW)).toBe(false);
  });

  it("drops an ACTIVE signal exactly past the grace window", () => {
    const signal = { status: "ACTIVE", createdAt: ago(COPY_OPEN_GRACE_MS + 1), closedAt: null };
    expect(isCopySignalEligible(signal, SUBSCRIBED, NOW)).toBe(false);
  });

  it("still serves an old PENDING signal — mirrored at the exact entry price", () => {
    const signal = { status: "PENDING", createdAt: ago(6 * 60 * 60 * 1000), closedAt: null };
    expect(isCopySignalEligible(signal, SUBSCRIBED, NOW)).toBe(true);
  });

  it("never serves a signal created before the follower subscribed", () => {
    const signal = {
      status: "ACTIVE",
      createdAt: new Date(SUBSCRIBED.getTime() - 1),
      closedAt: null,
    };
    expect(isCopySignalEligible(signal, SUBSCRIBED, NOW)).toBe(false);
  });

  it("serves a recently closed signal so the follower can exit", () => {
    const signal = {
      status: "CLOSED_WIN",
      createdAt: ago(48 * 60 * 60 * 1000),
      closedAt: ago(60 * 60 * 1000),
    };
    expect(isCopySignalEligible(signal, SUBSCRIBED, NOW)).toBe(true);
  });

  it("drops a signal closed more than 24h ago", () => {
    const signal = {
      status: "CLOSED_LOSS",
      createdAt: ago(72 * 60 * 60 * 1000),
      closedAt: ago(25 * 60 * 60 * 1000),
    };
    expect(isCopySignalEligible(signal, SUBSCRIBED, NOW)).toBe(false);
  });

  it("drops a closed signal with no closedAt timestamp", () => {
    const signal = { status: "CANCELLED", createdAt: ago(1000), closedAt: null };
    expect(isCopySignalEligible(signal, SUBSCRIBED, NOW)).toBe(false);
  });
});

describe("copyActiveOpenSince", () => {
  it("uses the grace window when the subscription is old", () => {
    expect(copyActiveOpenSince(SUBSCRIBED, NOW).getTime()).toBe(
      NOW.getTime() - COPY_OPEN_GRACE_MS,
    );
  });

  it("uses the subscription time when it is more recent than the grace window", () => {
    const justSubscribed = ago(60_000);
    expect(copyActiveOpenSince(justSubscribed, NOW).getTime()).toBe(justSubscribed.getTime());
  });
});
