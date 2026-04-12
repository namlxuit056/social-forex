import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests within limit", () => {
    const r1 = rateLimit("test-a", 3, 60_000);
    expect(r1.ok).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = rateLimit("test-a", 3, 60_000);
    expect(r2.ok).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = rateLimit("test-a", 3, 60_000);
    expect(r3.ok).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("blocks requests over limit", () => {
    rateLimit("test-b", 2, 60_000);
    rateLimit("test-b", 2, 60_000);
    const r3 = rateLimit("test-b", 2, 60_000);
    expect(r3.ok).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it("resets after window expires", () => {
    rateLimit("test-c", 1, 10_000);
    const blocked = rateLimit("test-c", 1, 10_000);
    expect(blocked.ok).toBe(false);

    vi.advanceTimersByTime(11_000);

    const fresh = rateLimit("test-c", 1, 10_000);
    expect(fresh.ok).toBe(true);
    expect(fresh.remaining).toBe(0);
  });

  it("tracks different keys independently", () => {
    rateLimit("user-1", 1, 60_000);
    const u1 = rateLimit("user-1", 1, 60_000);
    expect(u1.ok).toBe(false);

    const u2 = rateLimit("user-2", 1, 60_000);
    expect(u2.ok).toBe(true);
  });
});
