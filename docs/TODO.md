# TODO — Social Forex

## Giai đoạn A — UI & Design System

- [x] Hoàn tất checklist Giai đoạn A.

## Giai đoạn B — Dữ liệu thật & tích hợp

- [x] Quotes: Yahoo + fallback mock, API, cache, UI.
- [x] TradingView embed Dashboard.
- [x] Lịch kinh tế: FMP + cache DB + fallback mẫu + toggle VN/UTC + trạng thái live.
- [x] CI: GitHub Actions (lint + build + Postgres service).

## Giai đoạn C — Cộng đồng & kiếm tiền

- [x] Forum moderation (ForumReport, ẩn/xóa, rate limit).
- [x] VIP signals (VIP gate UX, admin panel, audit log).
- [x] UI tokens — refactor community components sang Shadcn.

## Giai đoạn D — Vận hành & mở rộng

### SEO & Open Graph

- [x] `sitemap.ts` — routes tĩnh + academy slugs.
- [x] `robots.ts` — allow/disallow chuẩn.
- [x] Metadata mỗi trang content chính (quotes, calendar, tools, forum, academy, resources, signals) có `description`.
- [x] Open Graph defaults: `metadataBase`, `openGraph`, `twitter` trong root layout.

### Error Handling & Resilience

- [x] `src/app/not-found.tsx` — trang 404 custom với CTA hữu ích.
- [x] `src/app/error.tsx` — trang lỗi runtime, reset + quay về trang chủ.
- [x] `src/app/global-error.tsx` — boundary cho lỗi root layout.

### Pháp lý & Disclaimer

- [x] Disclaimer tài chính trong footer (rõ ràng, có `<strong>`).
- [x] Disclaimer trên trang signals và academy (component `Disclaimer`).

### Security

- [x] Security headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) trong `next.config.ts`.

### Testing

- [x] Vitest setup + runner (`npm test`).
- [x] Unit tests: `rate-limit.ts` (4 tests), `vip.ts` (5 tests), `slug.ts` (8 tests) — 17/17 pass.
- [x] Test step thêm vào CI pipeline.

### Chất lượng

- [x] `npm run lint` sạch.
- [x] `npm run build` pass (36 routes, 0 errors).
- [x] `npm test` — 17 tests, 3 files, tất cả pass.

---

*Tất cả 4 giai đoạn A → D hoàn thành.*
