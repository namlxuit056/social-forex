export const XP_VALUES = {
  journalCreate: 10,
  planComplete: 15,
  signalPost: 20,
  signalWin: 30,
  forumPost: 5,
  streakBonus7: 50,
  streakBonus30: 200,
} as const;

export type XpAction = keyof typeof XP_VALUES;

export function calculateXp(action: XpAction, currentStreak?: number): number {
  let xp = XP_VALUES[action];
  if (currentStreak && currentStreak >= 30) xp += XP_VALUES.streakBonus30;
  else if (currentStreak && currentStreak >= 7) xp += XP_VALUES.streakBonus7;
  return xp;
}

export function getLevel(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

export function getXpProgress(xp: number): number {
  return xp % 100;
}
