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


## Low Priority — Sprint 3: Community

_(trống)_

## Đề xuất mới (chưa duyệt — cần user quyết trước khi đưa vào sprint)

_Đề xuất 2026-07-20, theo goal Sprint 2 "Trust & conversion". Lưu ý: tránh feature cần cron mới cho đến khi Neon quota reset (~1/8) — tất cả bên dưới đều là request-time, không cron._

- [ ] **VIP teaser + funnel** — user thường thấy card VIP signal dạng blur (symbol + direction hiện, entry/SL/TP mờ) kèm win rate lịch sử của VIP tier + CTA nâng cấp; log FunnelEvent tại các bước xem-teaser → xem-pricing → tạo-order để đo conversion (model FunnelEvent + PayPal flow có sẵn).

---

## Completed

- [x] Đánh giá provider — model CopyTradeReview (rating 1-5 + comment, unique [reviewerId, providerId], upsert), chỉ follower có CopyTrade ≥ 7 ngày với provider mới được đánh giá (kể cả đã unsubscribe); tab "Đánh giá" mới trên /u/[userId] hiện avg rating + phân bố sao + danh sách review, badge rating trên hero profile khi có ≥1 review, stat rating trong modal CopyTradeButton; report review + hide/unhide (MOD/ADMIN) tái dùng ForumReport (thêm copyTradeReviewId nullable FK) và pattern hideSignalComment, thêm block report vào /admin/reports. User chọn feature này trong 2 đề xuất chưa duyệt Sprint 2 (2026-08-02)

- [x] Academy auto-generate cron — daily cron (`0 3 * * *` UTC, /api/academy/auto-generate/run) tự chọn 3 chủ đề mới (dedupe với title đã có) qua generateTopicIdeas rồi generate + publish full lesson (VI+EN) cho từng chủ đề; logic saveLesson tách ra src/lib/ai/academy-auto-generate.ts dùng chung với admin bulk-generate. 1 topic lỗi không chặn 2 topic còn lại. Thêm bất chấp ghi chú "tránh cron mới đến khi Neon quota reset ~1/8" vì đây là cron 1 lần/ngày (không giữ DB thức như per-minute cron cũ) — cùng loại rủi ro thấp như ai/articles/run và journal/weekly-review/run đã bật lại trước đó (2026-07-26)

- [x] Copier social proof — badge "X đang copy" trên leaderboard (dưới tên trader), hero badges của /u/[userId], và modal CopyTradeButton (kèm "mới nhất: N ngày trước"/"hôm nay"); count + most-recent query trên CopyTrade (isActive), không cần model mới. "Mới nhất" đo theo thời điểm subscribe gần nhất (createdAt), không phải lần copy lệnh thực tế vì schema chưa có log copy riêng — đã note trong code. User chọn feature này trong 3 đề xuất chưa duyệt (2026-07-26)

- [x] Track record công khai — tab "Track record" trên /u/[userId] (query param ?tab=track): toàn bộ signal đã đóng dạng bảng (symbol/hướng/entry/SL/TP/kết quả/R/mở-đóng) + filter theo symbol + kết quả, tiles Max Drawdown / Profit Factor / Avg R; thêm maxDrawdownR/profitFactorR/avgR vào src/lib/signals/provider-equity.ts (có test), tái dùng buildEquityCurve/signalR đã ship. User chọn feature này trong 3 đề xuất chưa duyệt (2026-07-25)

- [x] Provider equity chart trên /u/[userId] — tab Overview hiện card "Đường cong hiệu suất (R)" khi provider có ≥ 5 signal đã đóng: equity curve tích lũy R + bars theo tháng (fill tháng trống, month arithmetic không overflow), win = RR entry→TP (fallback +1R), loss = -1R (TODO business: chưa tính TP2/TP3/partial close); pure logic src/lib/signals/provider-equity.ts có 10 tests; SVG theo convention journal-performance-chart (user duyệt 2026-07-19)

- [x] Onboarding checklist trên /start — 4 bước derive từ DB (journal đầu tiên / follow trader / price alert / bài academy hoàn thành), client component fetch /api/onboarding/status để giữ /start static; bonus +50 XP một lần qua claimOnboardingBonus (User.onboardingBonusAt, migration 20260719100000, guard updateMany chống double-claim); ẩn hoàn toàn sau khi đã nhận thưởng (user duyệt "có thưởng XP" 2026-07-19)

- [x] Price alert: re-arm / recurring — isRecurring + cooldownMinutes (5/15/30/60, default 15) + armed (migration 20260719090000); cron check chỉ fire khi giá cắt ngưỡng lúc đang armed và hết cooldown, disarm sau fire, re-arm khi giá quay về phía bên kia; alert recurring giữ isActive, dedupeKey theo timestamp mỗi lần fire; form có select Lặp lại + cooldown, list có badge Repeat + "lần cuối" (user duyệt 2026-07-19, cooldown default 15p)

- [x] Forum: pinned threads trong category — isPinned (migration 20260718120000), MOD/ADMIN có nút pin/unpin trên list (role check qua DB), thread ghim luôn đứng đầu với icon Pin, action toggleThreadPin trong moderation.ts + revalidatePath

- [x] Push notification payload i18n — User.locale (migration 20260718110000, lưu khi đổi ngôn ngữ qua LanguageSwitcher), namespace "push" trong messages, lib push-i18n dùng createTranslator (chạy được trong cron); 4 call sites price-alerts/weekly-review/mt5-auto-close/signal-create hết text cứng; followers nhận push theo ngôn ngữ từng người

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
