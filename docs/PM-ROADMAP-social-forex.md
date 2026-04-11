# Kế hoạch hoàn thiện Social Forex (PM / BA)

**Phiên bản:** 1.0 · **Cập nhật:** 2026-04-11

## 1. Mục tiêu sản phẩm

- **Tầm nhìn:** Nền tảng cộng đồng forex kết hợp công cụ (quotes, lịch, máy tính, biểu đồ), nội dung (academy, webinar, resources), và social (diễn đàn, tín hiệu free/VIP, tin nhắn, leaderboard, hồ sơ).
- **Người dùng chính:** Trader cá nhân tìm công cụ + học hỏi + tương tác; admin/mod quản trị nội dung và VIP.

## 2. Phạm vi & không phạm vi

| Trong phạm vi (giai đoạn này) | Ngoài phạm vi (để sau) |
|-------------------------------|-------------------------|
| Hoàn thiện UI/UX thống nhất, responsive, accessibility cơ bản | Ứng dụng native iOS/Android |
| Auth (đăng ký/đăng nhập), forum, signals, DM, profile theo schema hiện có | Matching engine / sàn giao dịch thật |
| Tích hợp giá demo → chuẩn bị pipeline giá thật (API/WebSocket) | Thanh toán thật production (cần compliance + PCI) |
| VIP flag + API admin (nền tảng cho monetization) | Hệ thống subscription đầy đủ (Stripe/PayPal) nếu chưa có yêu cầu pháp lý |

## 3. Hiện trạng kỹ thuật (đã có)

- **Stack:** Next.js 16, React 19, Prisma 7 + PostgreSQL (Neon), Auth.js, Tailwind CSS 4.
- **Tính năng đã scaffold:** trang chủ, quotes, calendar, tools, chart, sentiment, heatmap, forum (category/thread/reply), signals, messages, leaderboard, profile, academy, brokers, partners, resources, webinar, backtest, auth (signin/register).
- **DB:** User, Forum*, Signal, DirectMessage, follow — migrations đã áp dụng.

## 4. Giai đoạn triển khai (roadmap)

### Giai đoạn A — “Ổn định & nhất quán” (1–2 tuần)

- **Design system:** Chuẩn hóa màu (emerald/sky/amber trên nền zinc), typography, spacing, trạng thái nút/link, form error/success.
- **Navigation:** Rà soát `SiteHeader` / `SiteFooter`: mọi route quan trọng có mặt, trạng thái đăng nhập rõ ràng.
- **Chất lượng:** ESLint sạch; xử lý lỗi server action/API thống nhất (toast hoặc inline message).
- **Tiêu chí chấp nhận:** Không trang “trống” không có CTA; mobile không vỡ layout trên các trang chính.

### Giai đoạn B — “Dữ liệu thật & tích hợp” (2–4 tuần)

- **Quotes:** Thay mock bằng nhà cung cấp (REST/WebSocket), rate limit, fallback khi API lỗi.
- **Calendar:** Nguồn sự kiện kinh tế (hoặc CSV/API), timezone VN/UTC rõ ràng.
- **TradingView/chart:** Xác nhận embed/license; một symbol mặc định + danh sách watchlist (local hoặc DB).
- **Tiêu chí chấp nhận:** Giá/calendar cập nhật theo spec; có trạng thái loading và empty state.

### Giai đoạn C — “Cộng đồng & kiếm tiền” (song song B nếu có nguồn lực)

- **Forum:** Moderation (report, ẩn/xóa — role MOD/ADMIN), chống spam cơ bản.
- **Signals:** Quy tắc VIP (đã có `vipUntil` + API admin): UI khóa nội dung VIP, copy rõ ràng cho free user.
- **Monetization:** Tích hợp cổng thanh toán (sau khi có quyết định pháp lý), webhook cập nhật `vipUntil`.
- **Tiêu chí chấp nhận:** User VIP thấy signal VIP; admin có thể gán VIP qua flow an toàn (không lộ secret).

### Giai đoạn D — “Vận hành & mở rộng”

- Observability (logging, error tracking), backup DB, CI (lint + build), staging environment.
- SEO cho academy/resources; Open Graph cho chia sẻ link.

## 5. Phân vai trò (UI / Dev / PM)

| Vai trò | Giao việc chính |
|---------|------------------|
| **UX/UI** | Wireframe trang quan trọng, component library, dark theme nhất quán, empty/loading/error states. |
| **Senior Dev** | API contracts, Prisma migrations an toàn, Auth & RLS/quyền, performance (SSR/cache). |
| **PM/BA** | Ưu tiên backlog, acceptance criteria từng sprint, đồng bối cảnh pháp lý (forex/VN). |

## 6. Rủi ro & giả định

- **Giá & broker:** Phụ thuộc điều khoản API; có thể cần key riêng từng môi trường.
- **VIP/thanh toán:** Cần tư vấn pháp lý trước khi thu phí người dùng VN/quốc tế.
- **Nội dung tài chính:** Disclaimer “không phải tư vấn đầu tư” trên signal/education.

## 7. Backlog mẫu (Issues có thể tạo trên GitHub)

1. `[UI] Design tokens + refactor buttons/links`
2. `[API] Quotes provider adapter + env docs`
3. `[Feature] Signal room — VIP gate UX`
4. `[Admin] VIP grant audit log`
5. `[Ops] CI pipeline + preview deploy`

---

*Tài liệu này là đường ray làm việc; điều chỉnh milestone theo sprint thực tế của team.*
