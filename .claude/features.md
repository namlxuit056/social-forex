# Features Backlog — Social Forex

Mỗi dòng là một feature/improvement độc lập.
Để implement feature tiếp theo: gõ `/implement next feature`
Để implement feature cụ thể: gõ `/implement [tên feature]`

---

## High Priority — Sprint 1: Quick wins UX (est. ~1 tuần)

Mục tiêu: giảm friction ở các flow dùng hằng ngày (notifications, leaderboard, signals).

- [ ] **Notifications: mark single as read khi click (optimistic UI)** — markNotificationRead đã fire on click nhưng chưa có optimistic state update; cần local state để UI update ngay lập tức
  - AC: click notification → dot unread biến mất ngay (không chờ server); nếu action fail thì revert + không crash; unread count ở header giảm tương ứng; refresh trang vẫn đúng trạng thái.
- [ ] **Leaderboard: add pagination** — hiện load tất cả rows, cần limit 20 + "Load more"
  - AC: lần đầu chỉ load 20 rows; nút "Load more" append 20 rows tiếp (giữ nguyên sort/filter đang chọn); ẩn nút khi hết data; rank number liên tục qua các trang.
- [ ] **Signals list: filter by symbol** — thêm quick filter buttons XAUUSD / EURUSD / GBPUSD trên trang /signals
  - AC: filter là searchParam (share được URL); kết hợp được với filter/tier hiện có; nút "All" để bỏ filter; empty state khi symbol không có signal.

## Medium Priority — Sprint 2: Trust & conversion (est. ~1 tuần)

Mục tiêu: tăng độ tin cậy trước quyết định trả tiền/copy, chuẩn hoá thông báo đa ngôn ngữ.

- [ ] **Copy trade: hiển thị provider stats trước khi subscribe** — modal confirm hiện chỉ có tên, thêm winRate + signalCount
  - AC: modal hiện winRate (%, 1 chữ số thập phân) + tổng số signal đã đóng; provider chưa có signal đóng → hiện "Chưa đủ dữ liệu" thay vì 0%; số liệu khớp với trang profile của provider.
- [ ] **Push notification: cải thiện payload** — hiện dùng text cứng tiếng Việt; dùng template theo ngôn ngữ user
  - AC: payload build từ messages/vi.json + en.json theo locale user đã chọn; user chưa có locale → default vi; các kind push hiện có (price alert, signal…) đều qua template, không còn string cứng.

## Low Priority — Sprint 3: Community

- [ ] **Forum: pinned posts trong mỗi category** — MOD có thể pin thread quan trọng; thêm isPinned boolean + sort pinned first
  - AC: chỉ MOD/ADMIN thấy nút pin/unpin; thread pinned luôn đứng đầu category (có icon pin); tối đa sort pinned-first rồi mới đến sort thường; migration Prisma + revalidatePath.

## Đề xuất mới (chưa duyệt — cần user quyết trước khi đưa vào sprint)

- [ ] **Journal ↔ Signal link: log trade 1 chạm từ signal** — nút "Log vào journal" trên signal detail, prefill symbol/direction/entry; giả định: tăng số entry journal → weekly AI review hữu ích hơn. Câu hỏi mở: có link ngược từ journal entry về signal không?
- [ ] **Price alert: re-arm / recurring** — alert hiện fire 1 lần rồi tắt (cần verify); cho phép "lặp lại mỗi khi giá cắt ngưỡng" với cooldown chống spam. Câu hỏi mở: cooldown mặc định bao nhiêu phút?
- [ ] **Onboarding checklist trên /start** — 4–5 bước (tạo journal đầu tiên, follow 1 trader, đặt 1 price alert…) + XP thưởng; giả định: tăng activation user mới. Câu hỏi mở: có gate bằng XP system hiện tại không?

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
