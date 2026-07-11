# Features Backlog — Social Forex

Mỗi dòng là một feature/improvement độc lập.
Để implement feature tiếp theo: gõ `/implement next feature`
Để implement feature cụ thể: gõ `/implement [tên feature]`

---

## High Priority

_(trống — xem Medium Priority)_

## Medium Priority

- [ ] **Leaderboard: add pagination** — hiện load tất cả rows, cần limit 20 + "Load more"
- [ ] **Notifications: mark single as read khi click (optimistic UI)** — markNotificationRead đã fire on click nhưng chưa có optimistic state update; cần local state để UI update ngay lập tức

## Low Priority / Nice-to-have

- [ ] **Forum: pinned posts trong mỗi category** — MOD có thể pin thread quan trọng; thêm isPinned boolean + sort pinned first
- [ ] **Signals list: filter by symbol** — thêm quick filter buttons XAUUSD / EURUSD / GBPUSD trên trang /signals
- [ ] **Copy trade: hiển thị provider stats trước khi subscribe** — modal confirm hiện chỉ có tên, thêm winRate + signalCount
- [ ] **Push notification: cải thiện payload** — hiện dùng text cứng tiếng Việt; dùng template theo ngôn ngữ user

---

## Completed

- [x] Journal Weekly Review: score trend chart — biểu đồ xu hướng điểm AI theo tuần + delta vs tuần trước, trong journal-weekly-review.tsx (theo yêu cầu user muốn thấy "sự tiến bộ" qua thời gian)
- [x] Journal: export CSV — nút "Export CSV" trên bảng lịch sử /journal, xuất theo filter đang chọn (JournalTable trong src/app/[locale]/journal/journal-table.tsx)
- [x] Streak reminder notification: hardcode text → dùng i18n — đã fix từ trước (commit 219fc9d/89d3935), notification-list.tsx dùng t("streakReminder") có key ở cả vi.json/en.json, không còn hardcoded string
- [x] Profile /u/[userId]: Tab "Academy" hiện bài học đã hoàn thành — ProfileAcademySection tại src/components/profile/profile-academy-section.tsx, tab count badge = số bài đã hoàn thành (cũng thay thế nhu cầu "Academy: progress badge trên public profile")
- [x] Signal detail page: Add comment reaction (like/dislike) — SignalReactions component đầy đủ tại src/app/[locale]/signals/[signalId]/signal-reactions.tsx
- [x] Desk page: Trading dashboard widget — /desk có realtime quotes, calendar, chart, pre-trade desk tại src/app/[locale]/desk/page.tsx
- [x] Screener AI picks: cache kết quả — /api/screener/ai-picks có in-memory cache 5 phút (src/app/api/screener/ai-picks/route.ts)
- [x] Forum: Full-text search — upgrade từ LIKE → Postgres FTS (to_tsvector/plainto_tsquery) trên ForumThread.title + ForumPost.body với GIN index
- [x] Academy Progress UI: progress bar + checkmarks + Mark Complete button + Quiz
- [x] Academy: +25 XP khi hoàn thành bài học (via /api/academy/progress)
- [x] Trader Discovery: Suggested Traders trên dashboard feed empty state
- [x] Trader Discovery: Follow button trên leaderboard table rows
- [x] XP Level Badge: level + XP progress bar trên /profile page
- [x] Notifications: SIGNAL_WIN / SIGNAL_LOSS kinds + notify followers on close
- [x] Price Alerts: push notification khi giá chạm ngưỡng
- [x] Weekly Journal Review: AI tổng hợp journal tuần
- [x] Multi-symbol Auto-Scalp: cron job chạy scalping nhiều symbol
