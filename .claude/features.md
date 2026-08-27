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

### Đề xuất 2026-08-17 — Sprint 4: Kiểm soát trạng thái & tăng tỷ lệ thắng

Goal: (1) phát hiện/ngăn trading khi tâm lý xấu, quá tải rủi ro, revenge trading; (2) giúp trader ra quyết định tốt hơn dựa trên data journal/signal/screener đã có. Đã rà soát để không trùng: Journal Emotion Diary, Loss-streak banner (chỉ cảnh báo, chưa khoá), Journal Advanced Stats, Journal Edge Analytics, News guard, DailyTradingPlan (đã có field maxRiskPercent/maxTrades/checklist nhưng **chưa enforce ở đâu cả**).

**P2**
- [ ] **1-tap mood check-in** — tách khỏi `EmotionDiaryEntry` (note dài): 1 chạm chọn trạng thái (tốt/bình thường/mệt/stress) đầu phiên, hiện badge nhắc nhở site-wide nếu tự đánh dấu "not good" hôm đó.

### Đề xuất 2026-08-24 — Journal: thống kê nâng cao thêm

Goal: khai thác thêm data đã capture nhưng chưa lên stat, và bổ sung vài biểu đồ/metric phổ biến cho trading journal còn thiếu. Đã rà soát để không trùng: Journal Advanced Stats (tab Thống kê), Journal Edge Analytics (tab Edge), Journal Emotion Diary (tab Cảm xúc), Equity curve trên tab Trades — xem `project-journal-advanced-stats.md` trong memory.

**P1 — data đã có sẵn, chỉ cần thêm lib + UI**
- [ ] **R-multiple distribution histogram** — `r-multiple.ts` đã tính avgR/payoffRatio nhưng chưa có biểu đồ phân phối từng lệnh theo bucket R (vd: <-2R, -2..-1R, -1..0, 0..1R, 1..2R, >2R) trên tab Thống kê.
- [ ] **Drawdown chart dạng đường** — `advanced-stats.ts` chỉ trả 1 con số `maxDrawdown`; thêm chart drawdown chạy theo thời gian, build trên cùng data equity curve đã có (`chart-buckets.ts`).

**P2 — cần thêm field/schema hoặc effort lớn hơn**
- [ ] **MAE/MFE (max adverse/favorable excursion)** — chưa có field này trên `TradeJournal`; cần thêm cột + luồng capture (có thể chỉ làm được cho lệnh có link MT5 vì cần theo dõi giá suốt đời lệnh) trước khi lên được stat.
- [ ] **PDF/report export** — hiện chỉ có CSV (`journal-table.tsx`); thêm report định dạng để chia sẻ (mentor, prop-firm eval).
- [ ] **Goal tracking vs kế hoạch** — chưa có gì trong schema/UI; đặt target win-rate/R/PnL tháng rồi so với thực tế.

---

## Completed

- [x] Instant post-trade AI review — model `AiTradeReview` (unique tradeId, cache JSON review, hand-written migration `20260827100000_add_trade_review`); `src/lib/ai/trade-review.ts` với `buildTradeReviewContext` pure (9 tests) + `getAiTradeReview` (dùng chung `resolveAiProvider`, không cần cron). Chấm điểm **quy trình & kỷ luật** 1 lệnh (không phải thắng/thua): SL discipline, planned R:R, tuân thủ DailyTradingPlan ngày đó (maxTrades/checklist/bias/newsToAvoid), setup vs best-setup của trader, emotion, guard override, chất lượng note. Trả `{ score, verdict: disciplined|acceptable|undisciplined, summary, wentRight[], wentWrong[], disciplineFlags[], nextAction }`. API `POST /api/journal/trade-review` (auth + rate-limit VIP 5/60s free 2/300s + cache DB + `refresh` regen). UI: nút Sparkles per closed-trade trong `journal-table.tsx` mở expandable `TradeReviewCard`; sau khi log lệnh đã đóng, `journal-form.tsx` hiện luôn thẻ review inline (createTrade trả `{ tradeId, closed }`). Đề xuất Sprint 4 P2 (2026-08-17), user chọn trong 4 hướng (2026-08-27)

- [x] Emotion diary correlation với performance — `computeEmotionDiaryCorrelation` + `classifyDiaryMood` (`src/lib/journal/emotion-diary-correlation.ts`, 11 tests) trên tab Thống kê /journal: phân loại tâm trạng ghi chú `EmotionDiaryEntry` bằng rule-based keyword matching (bỏ dấu, word-boundary, không gọi AI — ưu tiên tiêu cực khi note khớp cả 2 loại từ khoá), so win-rate lệnh log vào ngày tâm trạng tiêu cực với các ngày còn lại; badge "Tâm trạng tiêu cực/tích cực" cũng hiện trên mỗi entry ở tab Cảm xúc để trader thấy classification đang dùng. Đóng vòng lặp cho Emotion Diary vốn trước đó chỉ là journal thuần. Đề xuất 2026-08-24 từ audit "journal thống kê còn thiếu gì" (2026-08-24)

- [x] Checklist compliance stat — `computeChecklistCompliance` (`src/lib/journal/checklist-compliance.ts`, 6 tests) trên tab Thống kê /journal: so % ngày hoàn thành đủ 5/5 mục `DailyTradingPlan.checked*` với win-rate của lệnh log vào ngày đó, tách 2 nhóm ngày đủ/thiếu checklist (theo pattern `playbook-adherence.ts`); đóng vòng lặp đo lường cho Pre-trade checklist gate (`checklist-guard-hint.tsx`) vốn trước đó chỉ nhắc nhở chứ không đo tác động. Đề xuất 2026-08-24 từ audit "journal thống kê còn thiếu gì" (2026-08-24)

- [x] VIP teaser + funnel — teaser card VIP (masked) trên `/signals` và `/signals/[signalId]` giờ kèm dòng win rate lịch sử VIP tier (`getVipTierWinRateStats`, ẩn nếu <5 lệnh đã đóng — dùng chung ngưỡng `TRADER_STATS_MIN_SAMPLE`), component dùng chung `VipSignalTeaser` (`src/components/signals/vip-signal-teaser.tsx`). Log FunnelEvent qua 3 bước: xem-teaser (`signal_vip_blocked`, đã có sẵn constant nhưng chưa wire), bấm CTA → xem-pricing (`vip_upgrade_click` khi bấm, `vip_upgrade_view` khi `/upgrade-vip` render — cả 2 constant có sẵn nhưng chưa wire), tạo-order (`vip_order_create`, constant mới, log ngay khi PayPal `createOrder` trả về order id thành công). Dùng property `surface`/`cta` có sẵn trong `FunnelEvent` (không dùng `signalId`/`plan` tự do vì route `/api/analytics/track` chỉ whitelist surface/cta/destination/reason/locale). Đề xuất 2026-07-20, user chọn giữa 3 đề xuất chưa duyệt (2026-08-23)

- [x] Pre-trade checklist gate — dùng field có sẵn `DailyTradingPlan.checkedNews/checkedLevels/checkedRisk/checkedEmotion/checkedJournal` (trước đó chỉ lưu để hiển thị ở `/plan`, không gate gì cả): khi checklist hôm nay (UTC) chưa hoàn thành, hiện nhắc nhở mềm màu vàng kèm link "/plan" ở form "+ Thêm lệnh" journal và modal Copy trade (chỉ khi subscribe mới, không hiện khi Manage) — chỉ thông tin, không chặn submit, giống pattern News guard. Component dùng chung `ChecklistGuardHint` (`src/components/journal/checklist-guard-hint.tsx`) fetch `/api/journal/checklist-status`. P1 cuối cùng của Sprint 4, đóng hết mục risk-control trong roadmap (2026-08-19)

- [x] Off-playbook loss rate — trên tab Edge Analytics (`?tab=edge`), callout mới so tỷ lệ thua giữa lệnh khớp setup tốt nhất (từ Setup playbook match) và lệnh không khớp/chưa gắn setup: "Lệnh KHÔNG khớp setup tốt nhất có tỷ lệ thua X% (N lệnh) — so với Y% (M lệnh) khi khớp đúng". `computePlaybookAdherence` trong `src/lib/journal/playbook-adherence.ts` (pure, có test), chỉ hiện khi cả 2 nhóm có ≥2 lệnh W/L. Đóng vòng lặp cho Setup playbook match — trả lời "tôi có đang tự làm hại mình không" thay vì chỉ liệt kê win-rate-theo-setup. Đề xuất 2026-08-19, user chọn trong 3 ý cho tab journal

- [x] Journal Advanced Stats: 3 bổ sung — (1) **Log guard override**: `TradeJournal` thêm `overrodeDailyLimit`/`overrodeLossStreakGuard` (migration `20260819100000_journal_guard_overrides`), set khi trader bấm "vẫn lưu"/"vẫn tiếp tục" ở Daily limit enforcement / Revenge-trading cooldown; `LossStreakGuard` có thêm `onOverride` callback; stat mới "Lần Bỏ Qua Cảnh Báo" (tổng + tách theo loại) trên tab Thống kê — đóng vòng lặp đo lường cho 2 guard đã ship trước đó, chỉ áp dụng cho journal (chưa log override ở copy-trade guard). (2) **Theo thứ trong tuần**: `computeDayOfWeekStats` (tái dùng `buildGroupStats` đã export + nhãn `calWeekday0..6` có sẵn từ journal-calendar). (3) **Tuân thủ kế hoạch ngày**: `computePlanCompliance` so DailyTradingPlan.maxTrades với số lệnh thực log mỗi ngày, N/M ngày tuân thủ. Cả 3 đều pure logic có test trong `src/lib/journal/`. Đề xuất 2026-08-19 từ câu hỏi "tab thống kê nâng cao có đề xuất gì không", user duyệt làm cả 3 cùng lúc

- [x] Overexposure guard — không cần làm: `/positions` đã có sẵn "AI Portfolio Review" (`portfolio-review-panel.tsx` + `/api/ai/portfolio-review`, dùng `src/lib/ai/portfolio-review.ts`) phân tích toàn bộ vị thế đang mở cùng lúc — cảnh báo correlation (long/short trùng hoặc tương quan), tổng % risk so với equity, risk level, khuyến nghị hold/trim/close từng lệnh. Đúng nội dung đề xuất ban đầu, chỉ khác là on-demand (bấm nút, dùng AI) thay vì tự động hiện (rule-based, miễn phí) như hình dung lúc đề xuất. User chọn "bỏ qua, coi như đã xong" khi phát hiện trùng lặp lúc research để implement (2026-08-19)

- [x] Setup playbook match — dùng thẳng Journal Edge Analytics (win rate theo setup, đã có sẵn `computeEdgeGroups`): thêm `findBestRow` (đối xứng với `findWorstRow` đã có) chọn setup winRate cao nhất có ≥5 lệnh W/L, tính server-side trên `/journal` rồi truyền xuống form. Khi trader chọn setup khác setup tốt nhất đó trong form "+ Thêm lệnh", hiện gợi ý mềm màu vàng (không chặn submit) "Setup tốt nhất của bạn là X (68% thắng, 12 lệnh)..."; tab "Thống kê" cũng tô xanh setup tốt nhất tương tự cách tô đỏ setup tệ nhất đã có. Đơn giản hoá so với đề xuất ban đầu: **tự động tính**, không cho trader tự chọn/pin "1-2 best setup" thủ công — tránh thêm field/migration, tự cập nhật khi có thêm data. P1 đầu tiên trong Sprint 4 (2026-08-17)

- [x] Revenge-trading cooldown — nâng cấp `loss-streak.ts` từ banner-only thành khoá tạm: khi chạm ngưỡng 3 lệnh thua liên tiếp trong 24h (ngưỡng đã dùng cho push notification, gộp về 1 constant `COOLDOWN_THRESHOLD_LOSSES`), ẩn nút "Thêm lệnh" trên `/journal` và nút "Copy" (chỉ khi subscribe mới, không chặn "Manage" của user đã đang copy) trong 30 phút (`COOLDOWN_DURATION_MS`) kể từ lệnh thua gần nhất, có nút "Tôi đã bình tĩnh, tiếp tục" để bỏ qua bất cứ lúc nào (không khoá cứng). Component dùng chung `LossStreakGuard` (`src/components/journal/loss-streak-guard.tsx`) fetch `/api/journal/loss-streak-status`; pure logic `getLossStreakCooldown` trong `loss-streak.ts` (có test). P0 thứ 2 trong Sprint 4 "Kiểm soát trạng thái & tăng tỷ lệ thắng" (2026-08-17)

- [x] Daily limit enforcement — dùng field có sẵn `DailyTradingPlan.maxTrades` (trước đó chỉ lưu, không kiểm tra ở đâu cả): khi log trade mới trong `/journal` hoặc đặt lệnh MT5 (`New Order` dialog + quick Buy/Sell) vượt số lệnh tự đặt cho hôm đó (UTC), hiện cảnh báo dạng confirm — không hard-block, có nút "vẫn lưu/vẫn đặt" gửi lại kèm `confirmedOverLimit`. Logic đếm dùng chung `src/lib/journal/daily-limit.ts` (có test) cho cả `TradeJournal` và `Mt5Command`. TODO business: `maxRiskPercent` **chưa** enforce — journal không có account equity đáng tin cậy (không phải lệnh nào cũng gắn MT5), còn market order MT5 không lưu giá khớp lệnh nên không tính lại được risk $ đã dùng trong ngày mà không đoán số liệu; cần thêm field lưu risk $ tại thời điểm tạo lệnh nếu muốn làm đúng. Đây là P0 đầu tiên trong đề xuất Sprint 4 "Kiểm soát trạng thái & tăng tỷ lệ thắng" (2026-08-17)

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
