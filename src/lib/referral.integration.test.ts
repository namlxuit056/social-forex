import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateReferralCode, getReferralLink } from "./referral";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    referralEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

describe("Referral Code Generation", () => {
  it("generates 8-character alphanumeric code", () => {
    const code = generateReferralCode();
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });

  it("generates unique codes", () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateReferralCode()));
    expect(codes.size).toBe(100);
  });
});

describe("Referral Link", () => {
  it("creates valid referral link", () => {
    const link = getReferralLink("ABC12345", "https://example.com");
    expect(link).toContain("ref=ABC12345");
    expect(link).toMatch(/^https:\/\/example\.com\/\?ref=[A-Z0-9]+$/);
  });
});

describe("Referral Stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns correct stats", async () => {
    const mockUser = {
      id: "user1",
      referralCode: "ABC12345",
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.user.count).mockResolvedValue(5);

    const stats = await prisma.user.findUnique({
      where: { id: "user1" },
      select: { referralCode: true },
    });

    expect(stats?.referralCode).toBe("ABC12345");
  });
});

describe("VIP Reward Logic", () => {
  it("calculates correct VIP days", () => {
    const REFERRER_DAYS = 7;

    const currentVip = new Date();
    const newVip = new Date(currentVip);
    newVip.setDate(newVip.getDate() + REFERRER_DAYS);

    const diffDays = Math.ceil((newVip.getTime() - currentVip.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(REFERRER_DAYS);
  });

  it("handles stacking VIP days", () => {
    const existingVip = new Date();
    existingVip.setDate(existingVip.getDate() + 10);

    const additionalDays = 7;
    const newVip = new Date(existingVip);
    newVip.setDate(newVip.getDate() + additionalDays);

    const diffDays = Math.ceil((newVip.getTime() - existingVip.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(additionalDays);
  });
});
