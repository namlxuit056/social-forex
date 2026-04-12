# Spec — Trang chủ: liên kết affiliate Exness

## Mục tiêu

Là **visitor** vào trang chủ, tôi muốn **một lối rõ ràng** để mở tài khoản / đăng ký qua **Exness** (affiliate), để **chuyển đổi** từ nội dung cộng đồng sang broker phù hợp mà không làm lệch **CTA chính** (quotes, academy, dashboard).

## Liên kết affiliate (mặc định)

- **URL:** `https://one.exnessonelink.com/a/nmm9gkpy67`
- **Cấu hình (khuyến nghị):** biến môi trường `NEXT_PUBLIC_EXNESS_AFFILIATE_URL` trỏ tới URL trên; fallback trong code cùng giá trị để preview/local vẫn hoạt động nếu chưa set env.

## Phạm vi MVP (vị trí — quyết định PM)

1. **Chỉ trang chủ** `src/app/[locale]/page.tsx` — không thay thế trang `/brokers` (so sánh đa sàn vẫn độc lập).
2. **Sau khối CTA hero** (ba nút nội bộ: quotes, academy, dashboard): thêm **một** hành động phụ dạng **text link** hoặc **nút outline** (ví dụ “Mở tài khoản Exness” / “Trade with Exness”) mở **tab mới**.
3. **Thuộc tính link:** `target="_blank"`, `rel="noopener noreferrer sponsored"` (và `nofollow` nếu team SEO chọn — ghi chú trong implementation).

## Minh bạch & rủi ro

- **Disclosure ngắn** (EN + VI) ngay gần CTA: nội dung kiểu *liên kết affiliate, chúng tôi có thể nhận hoa hồng khi bạn đăng ký* — copy cụ thể do UX/i18n chốt, tránh giả dạng trang chính thức của Exness.
- **Không** auto-redirect; user chủ động click.

## Ngoài phạm vi (P2)

- Đồng bộ dòng Exness trong `/brokers` với cùng affiliate URL + badge “Partner”.
- Tracking UTM bổ sung (nếu Exness cho phép) — chỉ khi có quy ước analytics.

## Tiêu chí chấp nhận

- [ ] Locale `en` và `vi` đều hiển thị CTA + disclosure; không chuỗi cứng tiếng Anh chỉ một phía.
- [ ] Click đi đúng URL affiliate (ưu tiên từ env nếu đã cấu hình).
- [ ] Mở tab mới; `rel` phù hợp affiliate / bảo mật tab.
- [ ] Trợ năng: nhãn link có nghĩa cho screen reader (aria-label hoặc text đủ rõ).
- [ ] CTA **không** trộn visual với ba nút primary — thứ bậc: nội dung sản phẩm trước, broker sau.

## Handoff

- **UX/UI:** Cập nhật `docs/design-system.md` nếu cần pattern “external affiliate CTA” (kích thước, màu outline, khoảng cách dưới hero).
- **Senior Dev:** Implement theo spec + `.env.example` (dòng `NEXT_PUBLIC_EXNESS_AFFILIATE_URL`).

---

# Spec — Lịch kinh tế API (Giai đoạn B)

## User story

Là **trader**, tôi muốn xem **lịch sự kiện kinh tế** với giờ rõ ràng (VN/UTC), biết sự kiện **sắp diễn / đang công bó / đã xong**, và dữ liệu **ưu tiên từ nguồn thật**; khi API lỗi hoặc hết hạn tôi vẫn thấy **cache hoặc dữ liệu mẫu** kèm **cảnh báo**, không bị trang trắng.

## Nguồn dữ liệu

- **Chính:** Financial Modeling Prep (FMP) — endpoint `stable/economic-calendar`, tham số `from` / `to` / `apikey`.
- **Yêu cầu:** Biến môi trường `FMP_API_KEY` (đăng ký tại [financialmodelingprep.com](https://financialmodelingprep.com)).
- **Lưu ý gói FMP:** Endpoint lịch kinh tế có thể trả **HTTP 402** (Restricted Endpoint) trên gói free — khi đó ứng dụng **chỉ hiển thị dữ liệu mẫu** và thông báo thân thiện, không dump lỗi thô.
- **Fallback:** Bảng dữ liệu mẫu trong code (`sampleCalendar`) khi không có key, FMP trả 0 sự kiện, 402/subscription, hoặc lỗi không có cache DB.

## Tần suất đồng bộ & cache

- **TTL:** `CALENDAR_SYNC_TTL_MINUTES` (mặc định **45** phút). Trong TTL, server **đọc từ PostgreSQL** (`EconomicCalendarEvent`), **không** gọi lại FMP.
- **Khi hết TTL hoặc DB trống:** Gọi FMP, **xóa và ghi lại** bảng sự kiện, cập nhật `CalendarSyncMeta.lastSyncAt`.
- **Khi FMP lỗi** nhưng DB còn dữ liệu cũ: Trả **cache DB** + `warning` (nguồn `stale_db`).

## Xử lý lỗi API

- Lỗi HTTP / parse / timeout → thử hiển thị **cache DB**; nếu không có → **mẫu** + thông báo lỗi ngắn.
- Không throw ra UI: trang `/calendar` luôn render được.

## Đồng bộ timezone

- **Lưu:** `timeUtc` dạng ISO UTC trong DB.
- **Hiển thị:** Toggle **VN** (`Asia/Ho_Chi_Minh`) / **UTC** trên client; không đổi dữ liệu gốc, chỉ đổi cách format.
- Trạng thái **Sắp diễn / Đang công bố / Đã xong** tính từ so sánh `timeUtc` với **giờ hiện tại** trình duyệt (cập nhật ~30s), cửa sổ “live” ~**90 phút** sau giờ sự kiện.

## Tiêu chí chấp nhận

- [ ] Có `FMP_API_KEY` → sau sync lần đầu, bảng có sự kiện thật (khoảng ngày theo API).
- [ ] Không có key → cảnh báo + dữ liệu mẫu.
- [ ] Toggle VN/UTC không làm mất scroll / không crash; chuyển zone dùng `startTransition` để giảm giật.
- [ ] Cột trạng thái phản ánh thời gian thực (upcoming / live / finished).

## Staging & CI (P1)

- **CI:** GitHub Actions chạy `npm ci` → `npm run lint` → `prisma migrate deploy` → `next build` với PostgreSQL service.
- **Staging:** Dùng `DATABASE_URL` riêng (Neon branch / Postgres), copy `.env.example` → `.env.staging`, set `FMP_API_KEY` và secrets Auth; deploy preview (Vercel/GitHub) trỏ DB staging.

---

# Spec — Signal: upload ảnh (chart / setup)

## Mục tiêu

Là **trader đăng signal**, tôi muốn **đính kèm một hoặc vài ảnh** (screenshot chart, setup) cùng tín hiệu để người xem hiểu ngữ cảnh nhanh hơn chỉ bằng số entry/SL/TP.

## Phạm vi (MVP đề xuất)

- **Có:** Upload khi **tạo signal** (form `/signals`); hiển thị thumbnail + lightbox/xem lớn trên **danh sách** và **trang chi tiết** `/signals/[id]`.
- **Số lượng:** Tối đa **3 ảnh** / signal (tránh abuse & chi phí lưu trữ).
- **Định dạng:** `image/jpeg`, `image/png`, `image/webp` (từ chối SVG upload trực tiếp — rủi ro XSS nếu serve sai).
- **Kích thước:** Tối đa **~2 MB** / file (có thể resize phía client trước khi gửi).
- **Quyền xem:** Giữ **cùng quy tắc VIP** như signal: nếu signal VIP và user không VIP → **không hiển thị ảnh** (hoặc placeholder “VIP”), tránh lộ setup qua ảnh.

## Ngoài phạm vi (có thể P2)

- Sửa/xóa ảnh sau khi đăng (chỉ author hoặc MOD).
- OCR / auto-detect giá từ ảnh.
- Video / GIF động.

## Dữ liệu

- **Ưu tiên:** Bảng con `SignalImage` — `id`, `signalId`, `url` (public URL object storage), `sortOrder`, `createdAt`. Không lưu binary trong Postgres.
- **Lưu trữ:** Object storage có CDN (Vercel Blob, S3 + CloudFront, Cloudinary, Uploadthing). Biến môi trường: token/key bucket; URL public chỉ đọc.

## Luồng kỹ thuật (gợi ý)

1. Client chọn file → validate type/size → (optional) resize Web API.
2. **Presigned URL** hoặc API route nhận `multipart` → upload lên storage → trả `url`.
3. `createSignal` nhận thêm danh sách `imageUrls[]` (hoặc `imageIds[]`) đã upload; transaction tạo `Signal` + `SignalImage`.

## Bảo mật & kiểm duyệt

- Chỉ user đã đăng nhập; rate limit theo user (đã có pattern trên signal).
- MOD/ADMIN: có thể ẩn signal (đã có) — ảnh đi theo; cân nhắc xóa object khi signal bị xóa (lifecycle hook hoặc cron).

## Tiêu chí chấp nhận

- [ ] Đăng signal kèm 0–3 ảnh thành công; ảnh hiện đúng trên list + detail.
- [ ] Signal VIP + viewer không VIP: không thấy nội dung ảnh thật (placeholder).
- [ ] Từ chối file quá lớn / sai MIME; thông báo rõ ràng (i18n).
- [ ] Build & typecheck pass; không lộ secret storage ra client.

## Rủi ro

- **Chi phí** storage/băng thông nếu traffic lớn — cần giới hạn số file & dung lượng.
- **Nội dung vi phạm** trên ảnh — giữ báo cáo signal (mở rộng sau) hoặc dựa vào moderation hiện có.

---

# Spec — Signal Room (`/[locale]/signals`) — UX / UI (kế hoạch PM)

**Tham chiếu live:** [Signal Room (EN)](https://social-forex.vercel.app/en/signals)

## Bối cảnh & vấn đề hiện tại

- Trang là **hub tín hiệu**: mô tả ngắn, CTA đăng nhập / VIP, form đăng (khi đã login), danh sách dạng **card xếp chồng dài**, disclaimer, hàng CTA footer.
- **Độ dài danh sách** (tới 100 item): khó quét nhanh symbol / trạng thái / thời gian; mỗi card có nhiều khối text (Entry / SL / TP dạng `dl`) + social counts + link chi tiết — **thứ bậc thị giác** chưa tách rõ “quan trọng nhất” vs “phụ”.
- **Người chưa đăng nhập:** thấy list FREE đầy đủ nhưng **VIP masked** — cần nhất quán thông điệp (đã có banner VIP + card masked) và tránh trùng lặp CTA.
- **Mobile:** card hiện flex-wrap + nhiều dòng; cần xác nhận tap target (badge, link “View detail”, nút đóng lệnh cho author).

## Mục tiêu sản phẩm

1. **Quét nhanh (scan):** user nhìn 2–3 giây biết symbol, LONG/SHORT, FREE/VIP, ACTIVE/đóng, và (nếu không masked) mức giá chính.
2. **Giảm tải nhận thức:** gom thông tin phụ (tác giả, giờ, reaction) thành một hàng meta rõ ràng; số Entry/SL/TP là **khối số** dễ đọc (tabular / mono).
3. **Luồng rõ:** đăng signal → xem list → vào detail / tương tác; VIP upgrade không che luồng chính nhưng **visible** khi có tín hiệu VIP trong list.
4. **Tin cậy & tuân thủ:** disclaimer và rủi ro vẫn **cuối trang**, không ẩn sau vô hạn scroll mà không có anchor.

## Thông tin kiến trúc trang (IA)

| Vùng | Nội dung | Ghi chú |
|------|----------|---------|
| **Hero** | H1 + mô tả 1 dòng | Giữ ngắn; có thể thêm 1 dòng “last updated” / số signal hôm nay (P2, cần API). |
| **Alert stack** | (1) Chưa login → đăng nhập để post (2) Có VIP trong list + user chưa VIP → upgrade | Thứ tự: login trước; gộp visual thành “banner strip” nếu cả hai hiện (P2). |
| **Primary** | Form tạo signal (chỉ khi logged in) | Có thể **collapse** “Đăng tín hiệu” mặc định thu gọn để list lên cao hơn (P1 đề xuất). |
| **Secondary** | Danh sách tín hiệu | Card hoặc **bảng responsive** / compact row + expand (P2). |
| **Legal** | Disclaimer signal | Giữ; có thể sticky mini-link “Disclaimer” (P2). |
| **Discovery** | `PageCtaRow` | Giữ; cân nhắc đổi heading “→” thành copy có nghĩa (i18n). |

## User stories (ưu tiên)

### P1 — MVP UX

- Là **viewer**, tôi muốn **lọc / gom** theo symbol hoặc tier (FREE chỉ / tất cả) để list ngắn lại trên mobile.
- Là **viewer**, tôi muốn **sticky subnav** hoặc anchor “Jump to list” khi form đăng mở cao.
- Là **author đã login**, tôi muốn **thu gọn form** đăng signal mặc định, chỉ mở khi bấm “Post signal”.
- Là **viewer**, tôi muốn **trạng thái signal** (ACTIVE / CLOSED_*) có màu / icon nhất quán, không chỉ text trong Badge outline.

### P2 — Nâng cao

- Sort: mới nhất / theo symbol / theo tier.
- Skeleton / pagination hoặc “Load more” thay vì 100 card một lần.
- Card **compact** trên mobile: một hàng symbol + direction + tier; tap expand chi tiết.
- Empty state phân biệt “chưa có signal nào” vs “lọc không có kết quả”.

## Tiêu chí chấp nhận (P1) — đã triển khai

- [x] Trên viewport mobile (≤390px), **không** cần scroll quá 2 viewport mới thấy **ít nhất một** dòng list (khi form thu gọn).
- [x] Entry / SL / TP (khi không masked) dùng **cùng alignment** (cột hoặc grid), font mono, đọc được với số dài.
- [x] Link “View detail” có **aria-label** / copy rõ (đã có i18n) và vùng bấm ≥ 44×44px tương đương.
- [x] Banner VIP + masked card không mâu thuẫn copy (đã kiểm tra EN/VI).

## Rủi ro & phụ thuộc

- **Performance:** 100 card + ảnh lazy — giữ `loading="lazy"`; P2 pagination giảm DOM.
- **i18n:** mọi nhãn mới (filter, collapse) phải có `en` + `vi`.
- **Triển khai:** sau khi spec/design được chốt, nhánh **Senior Dev** chỉnh `signals/page.tsx`, `signal-room.tsx`, có thể tách `SignalListToolbar` (client).

## Handoff

- **UX/UI:** cập nhật khung layout & component trong `docs/design-system.md` (mục Signal Room).
- **Dev:** implement P1 theo thứ tự: collapse form → list visual hierarchy → filter tối thiểu (tier hoặc symbol).

---

# Roadmap — Bước tiếp theo (PM / BA)

**Bối cảnh:** Giai đoạn A→E (TODO.md) đã đóng; Signal Room **P1** (collapse form, filter, card hierarchy, status màu) đã code. Tài liệu này ưu tiên **3–6 sprint** tới.

## 1. Mục tiêu đo lường (gợi ý)

| Chỉ số | Vì sao |
|--------|--------|
| Tỷ lệ hoàn thành đăng signal (đã login) | Form thu gọn có thể làm bước “mở form” tăng — cần baseline. |
| Thời gian đến “xem chi tiết” từ list | Đo gián tiếp qua click link / depth. |
| Lỗi upload ảnh (401/503) trên production | Đã có `AUTH_URL` / secure cookie — theo dõi sau deploy. |

*Cần công cụ: analytics sự kiện (hoặc log tổng hợp) — hạng mục Giai đoạn F.*

## 2. Giai đoạn F — “Tăng trưởng & bền vững” (ưu tiên đề xuất)

### F1 — Signal & social (2–3 sprint)

| # | Hạng mục | Mô tả ngắn | Phụ thuộc |
|---|----------|------------|------------|
| F1.1 | **Signal list P2** | Sort (mới nhất / symbol / tier), pagination hoặc “Load more”, skeleton loading. | Spec P2 đã có trong mục Signal Room. |
| F1.2 | **Trang chi tiết signal** | Rà soát luồng comment / reaction / báo cáo: empty state, rate limit message, SEO `metadata`. | DB + actions hiện có. |
| F1.3 | **Ảnh signal (P2)** | Lifecycle: xóa object Blob khi xóa signal; (tuỳ chọn) report ảnh. | Vercel Blob API, moderation policy. |

### F2 — Monetization & tin cậy (song song, 2–4 tuần)

| # | Hạng mục | Mô tả ngắn | Phụ thuộc |
|---|----------|------------|------------|
| F2.1 | **Thanh toán VIP** | Stripe/PayPal (hoặc cổng VN) + webhook cập nhật `vipUntil`; trang “thank you / lỗi”. | Pháp lý, chính sách hoàn tiền. |
| F2.2 | **Email / thông báo** | Xác nhận đăng ký, VIP sắp hết hạn (optional). | SMTP hoặc Resend/SendGrid. |

### F3 — Vận hành & chất lượng (1–2 sprint)

| # | Hạng mục | Mô tả ngắn | Phụ thuộc |
|---|----------|------------|------------|
| F3.1 | **Observability** | Sentry (hoặc tương đương) cho server + client; alert lỗi build/deploy. | Tài khoản vendor. |
| F3.2 | **Staging** | Nhánh preview + DB Neon branch; checklist smoke trước production. | Vercel + env. |
| F3.3 | **PageCtaRow / copy** | Thay heading “→” bằng copy có nghĩa (i18n) trên các trang dùng preset. | UX copy. |

### F4 — Nội dung & giữ chân

| # | Hạng mục | Mô tả ngắn |
|---|----------|------------|
| F4.1 | **Webinar** | Một slot thật (YouTube/Vimeo embed + lịch) hoặc đăng ký chờ. |
| F4.2 | **Academy / SEO** | Internal link từ signals/forum về bài học liên quan; bài mới theo chủ đề. |

## 3. Thứ tự đề xuất (sprint)

1. **Sprint 1:** F1.1 (pagination/sort) + F3.3 (copy nhỏ, nhanh).  
2. **Sprint 2:** F1.2 (detail polish) + F3.1 (Sentry cơ bản).  
3. **Sprint 3:** F2.1 (bắt đầu thanh toán — spike + sandbox) **hoặc** F1.3 (Blob lifecycle) tùy ưu tiên doanh thu vs kỹ thuật.  
4. **Sprint 4+:** F2.2, F3.2, F4.x theo nguồn lực.

## 4. Rủi ro cần quyết định PM

- **Thu phí VIP tại VN:** cần xác nhận pháp lý trước khi commit F2.1.  
- **Chi phí Blob + bandwidth** khi traffic tăng: F1.1 giảm số card một lần; F1.3 tránh orphan files.

## 5. Handoff

- **UX/UI:** wireframe sort + pagination (mobile-first); màn hình thanh toán VIP.  
- **Senior Dev:** spike payment provider; estimate F1.1 query + cursor pagination.  
- **PM:** tạo issue GitHub theo bảng F1–F4; gắn nhãn `priority` / `phase-F`.
