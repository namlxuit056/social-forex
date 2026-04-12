# TODO — Social Forex

## Giai đoạn A — UI & Design System

- [x] Hoàn tất checklist Giai đoạn A.

## Giai đoạn B — Dữ liệu thật & tích hợp

- [x] Quotes: Yahoo + fallback mock, API, cache, UI.
- [x] TradingView embed Dashboard.
- [x] Lịch kinh tế: FMP + cache DB + fallback mẫu + toggle VN/UTC + trạng thái live.
- [x] CI: GitHub Actions (lint + test + build + Postgres service).

## Giai đoạn C — Cộng đồng & kiếm tiền

- [x] Forum moderation (ForumReport, ẩn/xóa, rate limit).
- [x] VIP signals (VIP gate UX, admin panel, audit log).
- [x] UI tokens — refactor community components sang Shadcn.

## Giai đoạn D — Vận hành & mở rộng

- [x] SEO: sitemap.ts, robots.ts, metadata + Open Graph cho mọi trang.
- [x] Error handling: not-found.tsx, error.tsx, global-error.tsx.
- [x] Disclaimer tài chính (footer, signals, academy).
- [x] Security headers (HSTS, X-Frame, CSP, Referrer-Policy).
- [x] Vitest + 17 unit tests (rate-limit, vip, slug).

## Giai đoạn E — Xóa dữ liệu ảo, hoàn thiện nội dung

### Dashboard

- [x] Stat cards thật: tín hiệu đang mở, lệnh đã đóng, tỷ lệ thắng, tin nhắn chưa đọc (từ DB).
- [x] Xóa "Watchlist (demo)", "P/L tuần (demo)", hardcoded values.
- [x] Xóa copy technical (env vars, fallback mock).

### Sentiment

- [x] Tính Long/Short % từ tín hiệu đang mở trong DB (không còn hardcoded array).
- [x] Empty state khi chưa có tín hiệu.

### Heatmap

- [x] Ma trận sức mạnh tính từ tỷ giá live (Yahoo Finance `changePct`).
- [x] Xóa `demoStrength()` cố định.

### Academy

- [x] 5 bài học có nội dung đầy đủ (body text thật, không còn "placeholder").
- [x] Lesson detail render inline markdown (bold, headers, lists).

### Resources

- [x] 6 liên kết thật (BabyPips, Investopedia, TradingView, ForexFactory, MyFxBook).
- [x] Xóa `href: "#"` và "(placeholder)".

### Brokers

- [x] 5 sàn thật (IC Markets, Exness, XM, Pepperstone, FXTM) với spread, quy định, nạp tối thiểu.
- [x] Xóa "Broker A (mẫu)".

### Webinar

- [x] Xóa rickroll iframe; thay bằng EmptyState "chưa có webinar nào được lên lịch".

### Trang chủ

- [x] Copy marketing thật, xóa "demo + pipeline WebSocket", "giai đoạn tiếp theo".
- [x] Thêm icon cho mỗi block.

### Profile

- [x] Xóa copy technical (ADMIN_SECRET, API endpoint).

### Chất lượng

- [x] `npm run lint` sạch.
- [x] `npm run build` pass (36 routes, 0 errors).
- [x] `npm test` — 17 tests pass.

---

*Tất cả 5 giai đoạn A → E hoàn thành. Không còn dữ liệu ảo trên sản phẩm.*

## Giai đoạn F — Tăng trưởng & bền vững (backlog)

*Kế hoạch chi tiết & sprint: `docs/specs.md` → **Roadmap — Bước tiếp theo**.*

### F1 — Signal & social

- [ ] Signal list: sort (mới nhất / symbol / tier) + pagination hoặc “Load more” + skeleton.
- [ ] Trang chi tiết signal: rà soát comment/reaction/report, metadata SEO.
- [ ] Ảnh signal P2: xóa Blob khi xóa signal; (optional) báo cáo ảnh.

### F2 — Monetization & tin cậy

- [ ] Thanh toán VIP (sandbox → production) + webhook `vipUntil`.
- [ ] Email xác nhận / nhắc VIP (optional).

### F3 — Vận hành

- [ ] Error tracking (vd. Sentry) + alert deploy/build.
- [ ] Staging + checklist smoke.
- [ ] PageCtaRow: heading có nghĩa (i18n), bỏ “→” vô nghĩa.

### F4 — Nội dung

- [ ] Webinar: một buổi thật hoặc embed + lịch.
- [ ] Academy: internal link từ signals/forum; bài mới theo chủ đề.

### Đã ship gần đây (ngoài TODO cũ)

- [x] Signal Room P1: form thu gọn, filter tier/symbol, card hierarchy, status màu, `AUTH_URL`/cookie production (upload).
