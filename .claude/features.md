# Features Backlog — Social Forex

Mỗi dòng là một feature/improvement độc lập.
Để implement feature tiếp theo: gõ `/implement next feature`
Để implement feature cụ thể: gõ `/implement [tên feature]`

---

## High Priority

- [ ] **Profile /u/[userId]: Tab "Academy" hiện bài học đã hoàn thành** — AcademyProgress model có sẵn, thêm tab mới trên public profile
- [ ] **Streak reminder notification: hardcode text → dùng i18n** — src/components/notifications/notification-list.tsx line 79 có hardcoded Vietnamese string

## Medium Priority

- [ ] **Journal: export CSV** — trader muốn export lịch sử giao dịch ra Excel; thêm nút "Export CSV" trên trang /journal
- [ ] **Leaderboard: add pagination** — hiện load tất cả rows, cần limit 20 + "Load more"
- [ ] **Academy: progress badge trên /u/[userId] public profile** — hiện chỉ có XP, thêm "X/20 bài học" badge
- [ ] **Notifications: mark single as read khi click (optimistic UI)** — markNotificationRead đã fire on click nhưng chưa có optimistic state update; cần local state để UI update ngay lập tức

## Low Priority / Nice-to-have

- [ ] **Forum: pinned posts trong mỗi category** — MOD có thể pin thread quan trọng; thêm isPinned boolean + sort pinned first
- [ ] **Signals list: filter by symbol** — thêm quick filter buttons XAUUSD / EURUSD / GBPUSD trên trang /signals
- [ ] **Copy trade: hiển thị provider stats trước khi subscribe** — modal confirm hiện chỉ có tên, thêm winRate + signalCount
- [ ] **Push notification: cải thiện payload** — hiện dùng text cứng tiếng Việt; dùng template theo ngôn ngữ user

---

## Completed

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
