# Features Backlog — Social Forex

Mỗi dòng là một feature/improvement độc lập.
Để implement feature tiếp theo: gõ `/implement next feature`
Để implement feature cụ thể: gõ `/implement [tên feature]`

---

## High Priority — Sprint 2: Nâng win rate

_(hoàn thành 2026-07-18 — xem Completed)_

## Sprint 1: Quick wins UX

_(hoàn thành 2026-07-18 — xem Completed)_

## Medium Priority — Sprint 2: Trust & conversion (est. ~1 tuần)

Mục tiêu: tăng độ tin cậy trước quyết định trả tiền/copy, chuẩn hoá thông báo đa ngôn ngữ.

- [ ] **Push notification: cải thiện payload** — hiện dùng text cứng tiếng Việt; dùng template theo ngôn ngữ user
  - AC: payload build từ messages/vi.json + en.json theo locale user đã chọn; user chưa có locale → default vi; các kind push hiện có (price alert, signal…) đều qua template, không còn string cứng.

## Low Priority — Sprint 3: Community

- [ ] **Forum: pinned posts trong mỗi category** — MOD có thể pin thread quan trọng; thêm isPinned boolean + sort pinned first
  - AC: chỉ MOD/ADMIN thấy nút pin/unpin; thread pinned luôn đứng đầu category (có icon pin); tối đa sort pinned-first rồi mới đến sort thường; migration Prisma + revalidatePath.

## Đề xuất mới (chưa duyệt — cần user quyết trước khi đưa vào sprint)
- [ ] **Price alert: re-arm / recurring** — alert hiện fire 1 lần rồi tắt (cần verify); cho phép "lặp lại mỗi khi giá cắt ngưỡng" với cooldown chống spam. Câu hỏi mở: cooldown mặc định bao nhiêu phút?
- [ ] **Onboarding checklist trên /start** — 4–5 bước (tạo journal đầu tiên, follow 1 trader, đặt 1 price alert…) + XP thưởng; giả định: tăng activation user mới. Câu hỏi mở: có gate bằng XP system hiện tại không?

---

## Completed

- [x] Journal: bỏ trần dữ liệu 200 lệnh — fetch 2000 lệnh cho stats/chart/edge/CSV, note "tính trên N lệnh gần nhất" khi chạm trần; bảng lịch sử render 200 hàng đầu + nút "Hiển thị thêm" (CSV vẫn xuất đủ)

- [x] Performance chart fixes — (1) DD tooltip ở chế độ % không còn scale 2 lần; (2) custom range bắt đầu ngày 29–31 không còn mất bucket tháng (JS month overflow) → trade không biến mất khỏi chart; (3) Profit Factor tính theo range đang chọn thay vì all-time; bucket logic tách ra src/lib/journal/chart-buckets.ts kèm regression tests

- [x] Journal Emotion tag — cột emotion (5 trạng thái: bình tĩnh/tự tin/FOMO/gỡ gạc/do dự), dropdown trong form thêm/sửa, hiện cạnh setup dưới symbol, nhóm "Theo cảm xúc" trong tab Thống kê (migration 20260718100000)
- [x] Journal Chart image — cột imageUrl, JournalImageField upload qua /api/signal-images/upload (Vercel Blob dùng chung), thumbnail trong bảng lịch sử mở full-size tab mới, cột ImageUrl trong CSV
- [x] Journal ↔ Signal link — đã có sẵn từ trước qua prefill (?symbol=&from=) + copiedFromSignalId, không cần làm thêm

- [x] Copy trade: provider stats trước khi subscribe — modal CopyTradeButton hiện win rate (1 chữ số thập phân) + số signal đã đóng, "chưa đủ dữ liệu" khi provider chưa có signal đóng; truyền từ leaderboard (số có sẵn) và /u/[userId] (2 count queries mới)

- [x] Journal R-multiple & Expectancy — realized R mỗi lệnh (entry/SL/exit), tiles Payoff ratio + Kỳ vọng R trong JournalStats, cột R trong bảng + CSV; src/lib/journal/r-multiple.ts (có test)
- [x] Journal Setup tags — cột setup (migration 20260718090000), dropdown 8 setup trong form thêm/sửa lệnh, nhãn setup dưới symbol trong bảng, nhóm "Theo setup" trong tab Thống kê

- [x] Journal Edge Analytics — tab "Thống kê" trên /journal: win rate theo symbol / phiên (Á-Âu-Mỹ, UTC) / Long-Short / nguồn lệnh, highlight nhóm thua nhiều nhất; pure logic trong src/lib/journal/edge-stats.ts (có test)
- [x] Loss-streak guard — banner đỏ trên /journal khi ≥ 2 lệnh thua liên tiếp trong 24h, web push đúng 1 lần khi chạm 3; src/lib/journal/loss-streak.ts (có test); createTrade giờ tự set closedAt khi log lệnh W/L/BE thiếu closedAt
- [x] News guard khi log trade — journal form check /api/calendar/upcoming (debounce 500ms) và hiện cảnh báo tin high-impact trong 24h tới cho symbol đang gõ; chỉ cảnh báo, không chặn submit
- [x] Notifications: optimistic mark-as-read khi click — local state trong notification-list.tsx, revert nếu server action fail
- [x] Leaderboard: pagination — searchParam `limit` (default 20) + nút "Load more" giữ nguyên timeframe/sortBy, rank liên tục
- [x] Signals list: quick filter by symbol — chips XAUUSD/EURUSD/GBPUSD mặc định (merge với watchlist), click chip active để bỏ chọn, nút "Tất cả" khi đang filter

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
