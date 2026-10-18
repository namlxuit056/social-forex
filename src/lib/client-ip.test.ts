import { describe, expect, it } from "vitest";
import { clientIp } from "./client-ip";

describe("clientIp", () => {
  it("prefers Cloudflare's connecting IP", () => {
    expect(clientIp(new Headers({ "cf-connecting-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9" }))).toBe("1.2.3.4");
  });

  it("ignores spoofed leading X-Forwarded-For entries", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "6.6.6.6, 5.5.5.5" }))).toBe("5.5.5.5");
  });

  it("falls back to unknown", () => {
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
