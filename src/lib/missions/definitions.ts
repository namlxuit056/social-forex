/** Catalog for the beginner "mission board" (Bảng nhiệm vụ người mới). Each mission is
 * auto-verified from data the user already generates elsewhere — no self-report. Copy lives
 * here bilingually (page chrome stays in messages/*.json) so the catalog is self-contained. */

export const MISSION_TIERS = ["setup", "firstTrades", "discipline", "habits"] as const;
export type MissionTier = (typeof MISSION_TIERS)[number];

export type MissionCopy = { title: string; desc: string };

export type MissionDef = {
  id: string;
  tier: MissionTier;
  /** XP granted on first claim. */
  xp: number;
  /** How many of the tracked thing completes the mission. Shown as "value/target". */
  target: number;
  /** Where the "Bắt đầu" link sends the user. */
  href: string;
  copy: { vi: MissionCopy; en: MissionCopy };
};

export const MISSIONS: MissionDef[] = [
  // ── Tier 1 · Chuẩn bị ───────────────────────────────────────────────
  {
    id: "academy-first",
    tier: "setup",
    xp: 15,
    target: 1,
    href: "/academy",
    copy: {
      vi: { title: "Học bài đầu tiên", desc: "Hoàn thành 1 bài học bất kỳ trong Academy." },
      en: { title: "Finish your first lesson", desc: "Complete any one Academy lesson." },
    },
  },
  {
    id: "alert-first",
    tier: "setup",
    xp: 15,
    target: 1,
    href: "/alerts",
    copy: {
      vi: { title: "Đặt cảnh báo giá", desc: "Tạo 1 price alert cho cặp bạn quan tâm." },
      en: { title: "Set a price alert", desc: "Create one price alert on a pair you follow." },
    },
  },
  {
    id: "follow-trader",
    tier: "setup",
    xp: 15,
    target: 1,
    href: "/leaderboard",
    copy: {
      vi: { title: "Theo dõi 1 trader", desc: "Follow một trader trên bảng xếp hạng để học cách họ giao dịch." },
      en: { title: "Follow a trader", desc: "Follow one trader from the leaderboard to learn their approach." },
    },
  },
  {
    id: "watchlist-3",
    tier: "setup",
    xp: 15,
    target: 3,
    href: "/quotes",
    copy: {
      vi: { title: "Lập watchlist 3 cặp", desc: "Thêm 3 cặp tiền vào danh sách theo dõi." },
      en: { title: "Build a 3-pair watchlist", desc: "Add three symbols to your watchlist." },
    },
  },

  // ── Tier 2 · Lệnh đầu tiên ──────────────────────────────────────────
  {
    id: "journal-first",
    tier: "firstTrades",
    xp: 20,
    target: 1,
    href: "/journal",
    copy: {
      vi: { title: "Ghi nhật ký lệnh đầu tiên", desc: "Log 1 lệnh vào nhật ký giao dịch." },
      en: { title: "Log your first trade", desc: "Record one trade in your journal." },
    },
  },
  {
    id: "journal-with-sl",
    tier: "firstTrades",
    xp: 20,
    target: 1,
    href: "/journal",
    copy: {
      vi: { title: "Lệnh có điểm dừng lỗ", desc: "Log 1 lệnh có nhập Stop Loss — luôn biết mình rủi ro bao nhiêu." },
      en: { title: "A trade with a stop loss", desc: "Log one trade with a Stop Loss filled in — always know your risk." },
    },
  },
  {
    id: "journal-setup-3",
    tier: "firstTrades",
    xp: 20,
    target: 3,
    href: "/journal",
    copy: {
      vi: { title: "Gắn nhãn setup cho 3 lệnh", desc: "Chọn setup cho 3 lệnh để về sau biết chiến thuật nào hiệu quả." },
      en: { title: "Tag 3 trades with a setup", desc: "Pick a setup on three trades so you can later see which one works." },
    },
  },
  {
    id: "journal-5",
    tier: "firstTrades",
    xp: 25,
    target: 5,
    href: "/journal",
    copy: {
      vi: { title: "Ghi đủ 5 lệnh", desc: "Log tổng cộng 5 lệnh — đủ để bắt đầu thấy pattern của bản thân." },
      en: { title: "Log 5 trades", desc: "Record five trades total — enough to start seeing your own patterns." },
    },
  },

  // ── Tier 3 · Kỷ luật ────────────────────────────────────────────────
  {
    id: "plan-first",
    tier: "discipline",
    xp: 25,
    target: 1,
    href: "/plan",
    copy: {
      vi: { title: "Hoàn thành kế hoạch ngày", desc: "Tích đủ checklist trước phiên trong /plan 1 ngày." },
      en: { title: "Complete a daily plan", desc: "Tick the full pre-session checklist in /plan for one day." },
    },
  },
  {
    id: "plan-3",
    tier: "discipline",
    xp: 30,
    target: 3,
    href: "/plan",
    copy: {
      vi: { title: "3 ngày có kế hoạch", desc: "Hoàn thành checklist kế hoạch ngày trong 3 ngày." },
      en: { title: "Plan on 3 days", desc: "Complete the daily-plan checklist on three days." },
    },
  },
  {
    id: "rr-discipline",
    tier: "discipline",
    xp: 30,
    target: 5,
    href: "/journal",
    copy: {
      vi: { title: "5 lệnh có R:R ≥ 1.5", desc: "Đóng 5 lệnh mà mục tiêu (TP) cách entry ít nhất 1.5 lần điểm dừng lỗ." },
      en: { title: "5 trades at R:R ≥ 1.5", desc: "Close five trades where the target is at least 1.5× the stop distance." },
    },
  },
  {
    id: "discipline-clean",
    tier: "discipline",
    xp: 30,
    target: 10,
    href: "/journal",
    copy: {
      vi: {
        title: "10 lệnh kỷ luật",
        desc: "Đóng 10 lệnh mà không quá 1 lần bấm bỏ qua cảnh báo (giới hạn ngày / chuỗi thua).",
      },
      en: {
        title: "10 disciplined trades",
        desc: "Close ten trades while overriding a guard (daily limit / loss streak) at most once.",
      },
    },
  },

  // ── Tier 4 · Thói quen ──────────────────────────────────────────────
  {
    id: "mood-5",
    tier: "habits",
    xp: 20,
    target: 5,
    href: "/journal?tab=emotion",
    copy: {
      vi: { title: "Điểm danh tâm lý 5 ngày", desc: "Check-in tâm trạng 5 ngày — tâm lý xấu là nguyên nhân thua phổ biến nhất." },
      en: { title: "Mood check-in on 5 days", desc: "Log your mood on five days — bad headspace is the most common cause of losses." },
    },
  },
  {
    id: "academy-5",
    tier: "habits",
    xp: 25,
    target: 5,
    href: "/academy",
    copy: {
      vi: { title: "Hoàn thành 5 bài học", desc: "Học xong 5 bài trong Academy." },
      en: { title: "Finish 5 lessons", desc: "Complete five Academy lessons." },
    },
  },
  {
    id: "weekly-review",
    tier: "habits",
    xp: 25,
    target: 1,
    href: "/journal",
    copy: {
      vi: { title: "Nhận đánh giá tuần đầu tiên", desc: "Ghi đủ lệnh trong tuần để AI tổng kết nhật ký của bạn." },
      en: { title: "Get your first weekly review", desc: "Log enough trades in a week for the AI to review your journal." },
    },
  },
  {
    id: "journal-days-5",
    tier: "habits",
    xp: 25,
    target: 5,
    href: "/journal",
    copy: {
      vi: { title: "Ghi nhật ký 5 ngày khác nhau", desc: "Log lệnh vào 5 ngày riêng biệt — biến việc ghi chép thành thói quen." },
      en: { title: "Journal on 5 separate days", desc: "Log trades on five different days — make journaling a habit." },
    },
  },
];

export const MISSIONS_BY_ID: Record<string, MissionDef> = Object.fromEntries(
  MISSIONS.map((m) => [m.id, m]),
);

export const TOTAL_MISSION_XP = MISSIONS.reduce((sum, m) => sum + m.xp, 0);

export function missionsForTier(tier: MissionTier): MissionDef[] {
  return MISSIONS.filter((m) => m.tier === tier);
}
