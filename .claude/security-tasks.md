# Security Tasks — Backlog

Từ security audit toàn codebase ngày 2026-07-26. Ưu tiên theo severity, sửa từ trên xuống.

Để implement: gõ `/implement [tên task]` hoặc làm thủ công theo Recommendation bên dưới.

---

## High Priority

- [ ] **VIP paywall bypass qua Copy-Trade signal feed** — `src/actions/copy-trade.ts:21-102` (`subscribeCopyTrade`) không check VIP trước khi cho follow provider bất kỳ; `src/app/api/copy-trade/signals/route.ts:57-82` trả về đầy đủ entry/SL/TP không lọc theo `tier`, trong khi trang signals thường (`src/app/[locale]/signals/page.tsx:167`) có mask VIP rõ ràng. Hệ quả: user free đăng ký copy-trade 1 provider VIP là lấy được y hệt dữ liệu VIP miễn phí — bypass hoàn toàn paywall.
  - Fix: require follower có VIP active (hoặc provider tự bật "copy-trade free") trong `subscribeCopyTrade`, và/hoặc filter `prisma.signal.findMany` theo `tier` + trạng thái VIP của follower trong route `/api/copy-trade/signals`, đồng bộ với cách `signals/page.tsx` đang mask.

## Medium Priority

- [ ] **Copy-trade token dùng RNG không an toàn** — `src/lib/referral.ts:1-9` (`generateReferralCode`, dùng chung cho referral code lẫn `CopyTrade.token`) dùng `Math.random()` (~40 bit entropy), trong khi đây là bearer credential duy nhất cho `/api/copy-trade/signals`. `Mt5Connection` token trong cùng codebase đã làm đúng bằng `randomBytes(32)` (`src/lib/mt5-bridge.ts:5-7`) — copy pattern đó sang cho copy-trade token.
  - Fix: đổi `generateReferralCode()` (ít nhất phần dùng cho `CopyTrade.token`) sang `crypto.randomBytes`/`randomUUID`.

- [ ] **Cron `/api/streak-reminder` fail-open khi thiếu `CRON_SECRET`** — `src/app/api/streak-reminder/route.ts:13-16` dùng `if (secret && authHeader !== ...)`, nếu `CRON_SECRET` chưa set thì bỏ qua check hoàn toàn (khác với pattern fail-closed `if (!expected) return false` mà mọi cron route khác đang dùng). Hiện tại chưa khai thác được vì `CRON_SECRET` đã set trong env, nhưng là một lỗi logic cần sửa cho nhất quán + an toàn nếu env var bị xoá nhầm.
  - Fix: đổi thành `if (!secret) return 401` giống các cron route khác.

## Low Priority

- [ ] **Copy-trade token truyền qua URL query param, không rotate** — `src/app/api/copy-trade/signals/route.ts:11-13` đọc token từ `?token=` thay vì header `Authorization: Bearer` (khác MT5 bridge token — chỉ dùng header). Token cũng không đổi khi re-subscribe (`copy-trade.ts:82`), tồn tại vĩnh viễn tới khi unsubscribe.
  - Fix: chuyển sang `Authorization: Bearer`, cân nhắc cho phép rotate token theo yêu cầu.

## Backlog / theo dõi thêm (không phải lỗ hổng trực tiếp)

- [ ] **PayPal chưa xử lý refund/dispute** — webhook chỉ nhận `PAYMENT.CAPTURE.COMPLETED`/`CHECKOUT.ORDER.COMPLETED`, không handle `PAYMENT.CAPTURE.REFUNDED`/`REVERSED`/`DENIED` để thu hồi `vipUntil`. User có thể trả tiền, nhận VIP, rồi dispute hoàn tiền qua PayPal mà vẫn giữ VIP hết thời hạn đã cấp. Lỗ hổng doanh thu (business logic), không phải lỗ hổng auth/injection.
- [ ] **`article-chat.tsx` render AI reply qua `marked.parse()` không sanitize** — `src/components/ai/article-chat.tsx:164`, risk thấp (chỉ self-XSS nếu user tự prompt-inject model để echo HTML/script vào chính reply của mình, không có đường lan sang user khác). Cân nhắc thêm DOMPurify cho defense-in-depth.

---

## Đã audit sạch (không cần làm gì)

Auth/session (NextAuth), admin authorization, IDOR trên toàn bộ `src/actions/*` + API routes, SQL injection/path traversal/SSRF, MT5 bridge core (`Mt5Connection` token — đã dùng đúng `randomBytes(32)`), file upload (allow-list MIME + content-type server-side), AI provider API keys (không leak ra client), unscoped `prisma.user.find*` (5 chỗ thiếu `select` nhưng không serialize field nhạy cảm ra client).
