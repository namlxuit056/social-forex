import { describe, it, expect } from "vitest";
import { calculateXp, getLevel, getXpProgress } from "./xp";

describe("calculateXp", () => {
  it("returns base XP for journalCreate", () => {
    expect(calculateXp("journalCreate")).toBe(10);
  });

  it("returns base XP when streak < 7", () => {
    expect(calculateXp("journalCreate", 5)).toBe(10);
  });

  it("adds streakBonus7 when streak >= 7", () => {
    expect(calculateXp("journalCreate", 7)).toBe(60);
  });

  it("adds streakBonus30 when streak >= 30", () => {
    expect(calculateXp("journalCreate", 30)).toBe(210);
  });

  it("adds streakBonus7 to signalWin", () => {
    expect(calculateXp("signalWin", 10)).toBe(80);
  });

  it("returns correct XP for all actions", () => {
    expect(calculateXp("journalCreate")).toBe(10);
    expect(calculateXp("planComplete")).toBe(15);
    expect(calculateXp("signalPost")).toBe(20);
    expect(calculateXp("signalWin")).toBe(30);
    expect(calculateXp("forumPost")).toBe(5);
  });
});

describe("getLevel", () => {
  it("returns level 1 for 0 XP", () => {
    expect(getLevel(0)).toBe(1);
  });

  it("returns level 1 for 99 XP", () => {
    expect(getLevel(99)).toBe(1);
  });

  it("returns level 2 for 100 XP", () => {
    expect(getLevel(100)).toBe(2);
  });

  it("returns level 5 for 450 XP", () => {
    expect(getLevel(450)).toBe(5);
  });
});

describe("getXpProgress", () => {
  it("returns 0 for 0 XP", () => {
    expect(getXpProgress(0)).toBe(0);
  });

  it("returns 50 for 150 XP", () => {
    expect(getXpProgress(150)).toBe(50);
  });

  it("returns 0 for 200 XP", () => {
    expect(getXpProgress(200)).toBe(0);
  });
});
