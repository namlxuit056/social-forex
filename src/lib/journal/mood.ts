/** Trạng thái tâm lý 1 chạm — tách khỏi EmotionDiaryEntry (note dài). */
export const MOODS = ["good", "ok", "tired", "stressed"] as const;

export type Mood = (typeof MOODS)[number];

export function parseMood(value: unknown): Mood | null {
  return typeof value === "string" && (MOODS as readonly string[]).includes(value)
    ? (value as Mood)
    : null;
}

/** tired / stressed → nên cảnh báo, giảm size hoặc nghỉ. */
export function isNegativeMood(mood: Mood | null | undefined): boolean {
  return mood === "tired" || mood === "stressed";
}

export const MOOD_EMOJI: Record<Mood, string> = {
  good: "😃",
  ok: "🙂",
  tired: "😪",
  stressed: "😣",
};
