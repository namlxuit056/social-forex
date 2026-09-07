export type CronJobKey =
  | "screener-auto-run"
  | "screener-auto-review"
  | "scalping-auto-run"
  | "mt5-reconcile-signals"
  | "mt5-trailing-stop"
  | "price-alerts-check"
  | "journal-weekly-review"
  | "journal-daily-review"
  | "academy-auto-generate"
  | "calendar-sync"
  | "tv-rating-check"
  | "tv-rating-daily-summary";

export type CronJobMeta = {
  key: CronJobKey;
  label: string;
  description: string;
  schedule: string;
  /** "trade" jobs can place/close real orders — the UI asks for confirmation first. */
  risk: "trade" | "normal";
  /** Optional link to a settings sub-page for this job (e.g. lot-size config). */
  settingsHref?: string;
  settingsLabel?: string;
};

export const CRON_JOBS: CronJobMeta[] = [
  {
    key: "screener-auto-run",
    label: "Screener: tự bắn lệnh (score ≥ 70)",
    description: "Quét AI picks từ /screener, đăng Signal thật dưới tài khoản bot (SCREENER_BOT_USER_EMAIL) cho pick có điểm ≥ 70.",
    schedule: "3 lần/ngày · 8:30, 14:30, 19:30 (giờ VN)",
    risk: "trade",
    settingsHref: "/admin/crons/lot-sizes",
    settingsLabel: "Cấu hình lot",
  },
  {
    key: "screener-auto-review",
    label: "Screener: huỷ lệnh không còn đúng",
    description: "Re-check AI cho các lệnh auto-fire chưa được EA khớp, huỷ nếu đảo chiều hoặc điểm rớt dưới 70.",
    schedule: "Mỗi 30 phút",
    risk: "normal",
  },
  {
    key: "scalping-auto-run",
    label: "Auto-Scalp (multi-symbol)",
    description: "Chạy AI scalping cho từng symbol đã bật trong Auto-Scalp Config của mỗi user VIP, tự bắn lệnh nếu đạt ngưỡng điểm/độ tin cậy riêng của user đó.",
    schedule: "Mỗi 30 phút, phút 15 và 45",
    risk: "trade",
    settingsHref: "/admin/scalping-calibration",
    settingsLabel: "Xem calibration",
  },
  {
    key: "mt5-reconcile-signals",
    label: "MT5: reconcile signal treo",
    description: "Đóng các Signal ACTIVE/PENDING mà vị thế MT5 liên kết đã biến mất nhưng bridge chưa kịp báo về.",
    schedule: "Hàng ngày 04:00 UTC",
    risk: "normal",
  },
  {
    key: "mt5-trailing-stop",
    label: "MT5: trailing stop",
    description: "Quét TrailingStopConfig đang bật, gửi lệnh TRAIL_UPDATE tới EA khi giá đi đủ xa để dời SL.",
    schedule: "Không có lịch tự động (per-minute đang tắt vì quota Neon) — chỉ chạy thủ công tại đây",
    risk: "trade",
  },
  {
    key: "price-alerts-check",
    label: "Price Alerts",
    description: "Kiểm tra các price alert đang bật so với giá hiện tại, gửi thông báo khi giá chạm ngưỡng.",
    schedule: "Không có lịch tự động (per-minute đang tắt vì quota Neon) — chỉ chạy thủ công tại đây",
    risk: "normal",
  },
  {
    key: "journal-weekly-review",
    label: "Journal: AI Weekly Review",
    description: "Sinh bài review AI hàng tuần cho user có ≥ 3 lệnh đóng trong tuần (bỏ qua user đã có review).",
    schedule: "Thứ 6 22:00 UTC (chính) + Chủ nhật 22:00 UTC (catch-up)",
    risk: "normal",
  },
  {
    key: "journal-daily-review",
    label: "Journal: AI Daily Review",
    description: "Sinh bài review AI hàng ngày cho user có ≥ 1 lệnh đóng trong ngày hôm trước (giờ VN, bỏ qua user đã có review).",
    schedule: "Hàng ngày 17:05 UTC (00:05 giờ VN, review ngày hôm trước)",
    risk: "normal",
  },
  {
    key: "academy-auto-generate",
    label: "Academy: tự sinh bài học",
    description: "Sinh và publish 3 bài học Academy AI mới.",
    schedule: "Hàng ngày 03:00 UTC",
    risk: "normal",
  },
  {
    key: "calendar-sync",
    label: "Lịch kinh tế: đồng bộ",
    description: "Lấy dữ liệu forecast/previous/actual từ TradingView, lưu DB + gửi tín hiệu buy/sell cho sự kiện vừa có actual.",
    schedule: "Mỗi 15 phút",
    risk: "normal",
  },
  {
    key: "tv-rating-check",
    label: "Technical rating (TradingView): tín hiệu chắc chắn",
    description: "Quét điểm kỹ thuật tổng hợp 4H+1D từ TradingView cho các symbol app hỗ trợ, gửi thông báo khi có Strong Buy/Sell được 1D xác nhận cùng chiều.",
    schedule: "Mỗi 15 phút",
    risk: "normal",
  },
  {
    key: "tv-rating-daily-summary",
    label: "Technical rating: tổng kết cuối ngày",
    description: "Đếm số tín hiệu chắc chắn đã fire trong ngày UTC, kiểm tra còn giữ chiều hay không, lưu 1 dòng tổng kết (tuần/tháng cộng dồn từ các dòng ngày khi hiển thị trên /quotes/technical-rating).",
    schedule: "Hàng ngày 16:55 UTC (23:55 giờ VN)",
    risk: "normal",
  },
];
