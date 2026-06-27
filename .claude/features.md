# Features Backlog — Social Forex

Mỗi dòng là một feature/improvement độc lập.
Để implement feature tiếp theo: gõ `/implement next feature`
Để implement feature cụ thể: gõ `/implement [tên feature]`

---

## High Priority

- [ ] **Signal detail page: Add comment reaction (like/dislike) với emoji reactions** — SignalReaction model đã có, cần UI trên trang /signals/[id]
- [ ] **Forum: Full-text search** — route /forum/search đã có nhưng chưa query DB; thêm Postgres full-text search trên ForumThread.title + ForumPost.body
- [ ] **Desk page: Trading dashboard widget** — /desk route là stub; build trang tổng hợp realtime quotes + alerts + open signals + journal summary
- [ ] **Profile /u/[userId]: Tab "Academy" hiện bài học đã hoàn thành** — AcademyProgress model có sẵn, thêm tab mới trên public profile
- [ ] **Streak reminder notification: hardcode text → dùng i18n** — src/components/notifications/notification-list.tsx line 64 có hardcoded Vietnamese string

## Medium Priority

- [ ] **Screener AI picks: cache kết quả 15 phút** — /api/screener/ai-picks hiện không cache, gọi AI mỗi request; thêm in-memory cache tương tự ai/suggest.ts
- [ ] **Journal: export CSV** — trader muốn export lịch sử giao dịch ra Excel; thêm nút "Export CSV" trên trang /journal
- [ ] **Leaderboard: add pagination** — hiện load tất cả rows, cần limit 20 + "Load more"
- [ ] **Academy: progress badge trên /u/[userId] public profile** — hiện chỉ có XP, thêm "X/20 bài học" badge
- [ ] **Notifications: mark single as read khi click (optimistic UI)** — hiện chỉ có markAllRead form action; thêm optimistic update trong NotificationList

## Low Priority / Nice-to-have

- [ ] **Forum: pinned posts trong mỗi category** — MOD có thể pin thread quan trọng; thêm isPinned boolean + sort pinned first
- [ ] **Signals list: filter by symbol** — thêm quick filter buttons XAUUSD / EURUSD / GBPUSD trên trang /signals
- [ ] **Copy trade: hiển thị provider stats trước khi subscribe** — modal confirm hiện chỉ có tên, thêm winRate + signalCount
- [ ] **Push notification: cải thiện payload** — hiện dùng text cứng tiếng Việt; dùng template theo ngôn ngữ user

---

## Completed

- [x] Academy Progress UI: progress bar + checkmarks + Mark Complete button + Quiz
- [x] Academy: +25 XP khi hoàn thành bài học (via /api/academy/progress)
- [x] Trader Discovery: Suggested Traders trên dashboard feed empty state
- [x] Trader Discovery: Follow button trên leaderboard table rows
- [x] XP Level Badge: level + XP progress bar trên /profile page
- [x] Notifications: SIGNAL_WIN / SIGNAL_LOSS kinds + notify followers on close
- [x] Price Alerts: push notification khi giá chạm ngưỡng
- [x] Weekly Journal Review: AI tổng hợp journal tuần
- [x] Multi-symbol Auto-Scalp: cron job chạy scalping nhiều symbol
