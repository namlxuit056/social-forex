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

---

# Spec — i18n: locale `en` phải toàn bộ tiếng Anh (user-facing)

## Vấn đề

Khi user chọn **English**, một phần UI / thông báo / metadata vẫn hiển thị **tiếng Việt** vì copy không đi qua `next-intl` (hoặc không theo `locale`), mà bị **hardcode** trong component, Server Action, API route, `layout` gốc, hoặc module nội dung.

## Mục tiêu

- Với **`locale === en`**, mọi chuỗi **user-facing** (UI, toast, `confirm()`, lỗi trả về form/API mà client hiển thị, `metadata` theo locale, cảnh báo trên trang) là **tiếng Anh**.
- Với **`locale === vi`**, cùng các vị trí đó là **tiếng Việt** (hoặc song ngữ có chủ đích — ghi rõ nếu ngoại lệ).
- **Ngoài phạm vi giai đoạn 1:** comment code nội bộ, log server thuần devops (có thể giữ một ngôn ngữ).

## Phân loại nợ kỹ thuật (inventory — rà soát codebase)

| Nhóm | Ví dụ khu vực | Ghi chú |
|------|----------------|---------|
| **A. Server Actions** | `signals.ts`, `forum.ts`, `journal.ts`, `messages.ts`, `signal-social.ts`, `moderation.ts`, `admin-vip.ts`, `admin-signals.ts` | `return { error: "..." }` đang cố định tiếng Việt → cần key i18n hoặc map theo locale (truyền locale từ client / cookie / `headers`). |
| **B. API / Route Handlers** | `api/ai/suggest/route.ts`, `api/signal-images/upload/route.ts`, `api/auth/register/route.ts` | JSON `message`/`error` tiếng Việt → chọn locale từ `Accept-Language`, cookie `NEXT_LOCALE`, hoặc query; thống nhất một cách. |
| **C. Components (client) không dịch** | `dm-compose.tsx`, `reply-form.tsx`, `new-thread-form.tsx`, `report-button.tsx`, `vip-grant-form.tsx`, `register-form.tsx`, `mod-actions.tsx`, `economic-calendar.tsx`, `live-quotes-table.tsx`, `page-cta-row.tsx` (default heading) | Thay bằng `useTranslations` / nhận `label` từ server đã dịch. |
| **D. Pages (server) hardcode** | `forum/search/page.tsx` (metadata + toàn trang), `forum/[slug]/page.tsx`, `forum/.../thread/...`, `messages/[userId]`, `u/[userId]`, `forum/.../new`, `admin/vip` (cột “Tên”), `upgrade-vip` | Dùng `getTranslations` + `generateMetadata` theo locale. |
| **E. Root `layout.tsx`** | `metadata`, `openGraph`, keywords | Đang tiếng Việt cố định → chuyển sang `[locale]/layout` hoặc `generateMetadata` theo segment locale. |
| **F. Lib / warnings hiển thị UI** | `resolve-calendar.ts`, `resolve-quotes.ts`, `signal-images.ts`, `calendar-sample.ts`, `quotes/definitions.ts` (tên cặp), `page-cta-presets.ts` | Chuỗi đưa ra component → i18n; dữ liệu mẫu song ngữ hoặc key + dịch tại tầng UI. |
| **G. Nội dung dài (Academy / resources)** | `lib/content/academy.ts`, `resources.ts` | Quyết định PM: (1) bản EN + VI tách file theo locale, hoặc (2) chỉ EN trên `en`, VI trên `vi` — không dùng một file VI cho cả hai locale. |

## Chiến lược kỹ thuật (đề xuất Senior Dev)

1. **Chuẩn hóa một nguồn truth cho copy UI:** `messages/en.json` + `messages/vi.json`; hạn chế string literal trong TSX cho nhãn người dùng.
2. **Server Actions:**  
   - Cách A: truyền `locale` từ form (hidden field) và chọn message từ object `en`/`vi` trong action;  
   - Cách B: trả về **mã lỗi** (`errorCode: "RATE_LIMIT"`) và client dịch bằng `t()`.  
   Ưu tiên B nếu muốn tránh lệch tin cậy (user sửa hidden locale).
3. **`confirm()` / `alert()`:** dùng `useTranslations` trên client hoặc thay bằng dialog có i18n.
4. **Kiểm tra hồi quy:** grep `[àáảãạăâèéêìíòóôơùúưỳýđĐ]` trong `src/**/*.tsx` (trừ comment có chủ đích) + review `return { error:` trong `src/actions`.

## Tiêu chí chấp nhận (QA)

- [ ] Với `en`, không còn đoạn tiếng Việt **có dấu** trên các flow: đăng ký/đăng nhập, forum (tạo thread/reply/report/search), tin nhắn, signals (tạo/đóng/comment), journal, calendar, quotes, AI panel, admin (kể cả lỗi action), upgrade VIP.
- [ ] `metadata` (title/description) trang chủ và các trang chính khớp locale.
- [ ] Toast / validation / rate limit hiển thị đúng ngôn ngữ.
- [ ] Academy/resources: theo quyết định mục **G** (đồng nhất với locale).

## Thứ tự triển khai đề xuất (PM)

1. **Sprint i18n-1:** A + B (actions + API lỗi user-visible) + register/sign-in.  
2. **Sprint i18n-2:** C + D (components + pages forum/messages/profile).  
3. **Sprint i18n-3:** E + F (layout metadata, calendar/quotes warnings, presets).  
4. **Sprint i18n-4:** G (nội dung academy/resources theo locale).

## Handoff

- **UX/UI:** rà soát không dùng chuỗi dài trong `confirm`; ưu tiên dialog có `t()`.  
- **Senior Dev:** spike chọn pattern error code vs locale trong Server Actions; cập nhật `AGENTS.md` hoặc rule nội bộ “no user-facing string without i18n”.  
- **QA:** checklist trên staging với account EN end-to-end.

---

# Spec — Bối cảnh tin tức: lịch kinh tế gắn với cặp & tín hiệu

## Quyết định PM (hướng đã chọn)

Trong các đề xuất “tính năng đặc biệt”, **ưu tiên triển khai trước:** hiển thị **sự kiện kinh tế sắp tới (ưu tiên impact cao)** **liên quan đến cặp** mà user đang xem — trên **phòng tín hiệu** và/hoặc **trang chi tiết signal** — tận dụng nguồn lịch và DB hiện có (`EconomicCalendarEvent`), không yêu cầu user rời trang để mở `/calendar`.

**Tên làm việc:** *News context strip* / *Pair-linked economic events*.

## Mục tiêu kinh doanh

- Tăng **giá trị nhận thức** của signal room: không chỉ “entry/SL/TP” mà có **bối cảnh thời điểm** (tin có thể làm spike spread/slippage).
- Tăng **tần suất dùng calendar** gián tiếp (teaser + link sâu).
- Khác biệt sản phẩm: **forum + bảng giá** ít khi gắn tin theo **đúng cặp** user đang trade.

## User stories

1. Là **trader đang xem danh sách hoặc chi tiết signal**, tôi muốn **thấy ngay** các **sự kiện kinh tế impact cao** (trong cửa sổ thời gian đã chốt) **liên quan tới tiền tệ của cặp đó**, để **cân nhắc rủi ro** trước khi vào lệnh hoặc giữ lệnh.

2. Là **trader đang xem signal có cặp X**, tôi muốn **một lối rõ ràng** sang **trang lịch đầy đủ** đã **lọc sẵn** (cùng ngày / cùng currency nếu kỹ thuật cho phép), để **đào sâu** khi cần.

3. Là **visitor chưa đăng nhập**, tôi vẫn có thể **thấy teaser** (số lượng sự kiện hoặc dòng cảnh báo ngắn) **hoặc** thấy empty state rõ ràng — **không** lỗi trắng; quyền xem chi tiết titlename giữ **đồng nhất** với policy hiện tại của trang calendar (cache công khai).

4. Là **PM/Compliance**, tôi muốn mọi copy hiển thị kèm **disclaimer ngắn**: *đây là thông tin lịch, không phải khuyến nghị vào/thoát lệnh* — song ngữ **en** + **vi** (theo locale).

## Phạm vi MVP (P0)

- **Vị trí UI (chọn tối thiểu một, có thể cả hai nếu effort thấp):**
  - **A.** Trang **`/signals/[id]`** (chi tiết signal): khối “**Tin liên quan (24h tới)**” dưới hoặc cạnh khối giá/summary.
  - **B.** **Signal room** (list): với mỗi card (hoặc chỉ card đang expand/hover — do UX chọn), dòng phụ **1 sự kiện tiếp theo** hoặc badge “**N sự kiện USD/EUR…**” trong 24h — **ưu tiên đơn giản:** chỉ trên **detail** trước nếu list quá tải.

- **Cửa sổ thời gian:** `nowUtc` → `nowUtc + 24h` (có thể config hằng số server, ví dụ `NEWS_CONTEXT_HOURS=24`).

- **Lọc impact:** chỉ **`impact` thuộc tập “cao”** theo dữ liệu đang sync (chuẩn hóa case-insensitive: ví dụ `high`, `HIGH`, `High` — Senior Dev map về enum nội bộ).

- **Ánh xạ cặp → tiền tệ:** bảng/map trong code (MVP): ví dụ `EURUSD` → `[EUR, USD]`, `XAUUSD` → `[USD]` (hoặc thêm `XAU` nếu data có — fallback an toàn). Cặp không map được → **không hiển thị khối tin** + optional tooltip “Chưa hỗ trợ map cặp” (i18n) **hoặc** chỉ hiện link tới calendar (UX chốt).

- **Nguồn dữ liệu:** đọc **`EconomicCalendarEvent`** qua Prisma (cùng pattern cache/TTL hiện có của calendar — không bắt buộc gọi FMP trực tiếp từ request signal).

## Ngoài phạm vi MVP (P1 / P2)

- Push notification / email digest.
- Tự động cảnh báo khi user **tạo signal** trong vòng 30 phút trước tin NFP/CPI (wizard validation).
- Map cặp phức tạp (indices, crypto) đầy đủ; multi-day range; user tùy chỉnh khung giờ.

## Quy tắc ánh xạ & rủi ro dữ liệu

- **Đồng bộ timezone hiển thị:** dùng **cùng quy ước** với trang calendar (VN / UTC) — component tái sử dụng formatter hoặc prop `timeZone` từ user/locale.
- **DB trống / nguồn mẫu:** hiển thị empty state thân thiện (“Không có sự kiện impact cao trong 24h tới cho các tiền tệ này”) — **không** báo lỗi kỹ thuật.
- **Hiệu năng:** một query (hoặc ít query) có `where timeUtc in range` + `currency in (...)` + impact filter; index `@@index([timeUtc])` đã có — cân nhắc index gộp `(timeUtc, currency)` nếu explain chậm (P1).

## i18n (bắt buộc)

- Mọi nhãn, empty state, disclaimer, nút “Xem lịch đầy đủ” nằm trong **`messages/en.json`** và **`messages/vi.json`** (namespace gợi ý: `signals.newsContext` hoặc `calendar.pairContext` — thống nhất một namespace).

## Tiêu chí chấp nhận (QA)

- [ ] Với signal có `symbol` đã nmap (vd. `EURUSD`), trong 24h tới có bản ghi `EconomicCalendarEvent` đúng `currency` + impact cao → UI **liệt kê** ít nhất thời gian (theo zone đang chọn), currency, title (truncate nếu dài), và mức impact (badge/icon nhất quán design system).
- [ ] Không có sự kiện thỏa điều kiện → **empty state** đúng locale, không throw.
- [ ] `symbol` chưa có trong map → hành vi đã chốt ở MVP (ẩn khối **hoặc** chỉ CTA calendar) — **document trong PR** và nhất quán en/vi.
- [ ] Link “Xem lịch” dẫn tới `/calendar` (hoặc URL có query lọc nếu đã implement) và mở đúng locale (`/en/...`, `/vi/...`).
- [ ] Trang vẫn đạt **Lighthouse / không CLS** tệ do block mới (loading skeleton hoặc SSR đồng bộ — UX chốt).
- [ ] Disclaimer ngắn hiển thị gần khối tin; không thay thế disclaimer chung của trang signal nếu đã có.

## Phụ thuộc & thứ tự làm

1. **Spike kỹ thuật (0.5–1 ngày):** sample 20 dòng `EconomicCalendarEvent` — giá trị `impact` thực tế từ FMP/sample để chốt filter.
2. **Implement UI + query** theo MVP.
3. **QA:** so sánh với `/calendar` cùng ngày cho cùng currency (manual).

## Handoff

- **UX/UI:** wireframe khối trên desktop/mobile; thứ tự ưu tiên A (detail) trước B (list); trạng thái loading/empty; badge impact đồng bộ với calendar.
- **Senior Dev:** module `symbolToCurrencies(symbol: string): string[]`; hàm `getUpcomingHighImpactEvents({ currencies, from, to })`; tích hợp RSC hoặc server component tại `signals/[id]`; không hardcode copy.
- **PM:** tạo GitHub Issue một track; gắn nhãn `feature`, `signals`, `calendar`, `i18n`.
- **QA:** checklist trên staging với DB có/không có sự kiện; regression trang calendar.

---

# Spec — Thẻ uy tín trader (public performance) trên `/u/[userId]`

## Quyết định PM (chốt epic)

Trong hai hướng “đặc biệt” đã đề xuất:

| Epic | Góc | Ghi chú |
|------|-----|--------|
| **Signal → Journal một chạm** | Kỷ luật / workflow | Nối signal với nhật ký cá nhân. |
| **Thẻ uy tín trader (epic này)** | **Viral / share / social proof** | Số liệu công khai trên hồ sơ, dễ chụp màn hình và khoe link `/u/...`. |

**Chốt cho sprint epic tiếp theo (hướng hình ảnh):** triển khai **thẻ uy tín trader** trên trang hồ sơ công khai. Epic **Signal → Journal** giữ trong backlog (sprint sau hoặc song song nếu đủ nguồn lực).

## Mục tiêu

- Là **visitor**, tôi muốn **nhìn nhanh** mức độ “có số liệu” của người đăng signal trên nền tảng — **win rate** và **quy mô mẫu** — để quyết định có follow / xem thêm signal hay không.
- Là **trader có hồ sơ**, tôi muốn **uy tín được tính tự động** từ lịch sử **đóng lệnh công khai** (signal), không phải tự khai báo.

## Phạm vi nguồn dữ liệu (P0 — bắt buộc minh bạch)

- **Chỉ** bản ghi `Signal` thỏa:
  - `authorId` = user của trang `/u/[userId]`
  - `status` ∈ `{ CLOSED_WIN, CLOSED_LOSS }`
- **Loại trừ:** `ACTIVE`, `CANCELLED`.
- **VIP / FREE:** cùng một quy tắc đếm — trạng thái đóng là một phần hồ sơ công khai trên nền tảng; không tách dòng VIP trong MVP (P2 có thể tách báo cáo nếu compliance yêu cầu).

**Không** dùng `TradeJournal` làm nguồn P0 (dữ liệu nhật ký mang tính **cá nhân**, không đồng nhất “công khai trên nền tảng” như signal room).

## Định nghĩa chỉ số

| Chỉ số | Công thức / quy tắc |
|--------|---------------------|
| **Số lệnh đã đóng (mẫu)** | `n = count(CLOSED_WIN) + count(CLOSED_LOSS)` |
| **Win rate** | `count(CLOSED_WIN) / n × 100`, làm tròn **một** chữ số thập phân (hoặc số nguyên % — UX chốt). |
| **Điều kiện hiển thị %** | Chỉ hiển thị win rate khi `n >= N_min`. **N_min đề xuất:** `5` (tránh ảnh 100% với 1 lệnh). Nếu `n < N_min` và `n > 0`: có thể hiện “**X lệnh đã đóng — cần thêm dữ liệu để hiển thị tỷ lệ**” (copy i18n). Nếu `n = 0`: empty state ngắn. |

## Trung bình R (avg R)

- **Ngoài phạm vi MVP (P1):** hiện tại `Signal` đóng không lưu **exit price** / bội số R; không suy ra “avg R” đúng nghĩa mà không thêm field hoặc không liên kết journal.  
- **P1 (spike):** quy ước giản lược (vd. coi mỗi lệnh 1R risk) **chỉ** khi có đủ SL/TP và được legal/UX chấp nhận disclaimer — ghi spec riêng khi chốt.

## User stories

1. Là **visitor**, tôi xem `/u/[userId]` và thấy một **card** (hoặc strip) “**Thống kê signal (đã đóng)**” với win rate (khi đủ mẫu), số win / loss, và **disclaimer** một dòng.  
2. Là **visitor**, khi user **chưa có** lệnh đóng nào, tôi thấy **empty state** thân thiện, không ô trống lỗi.  
3. Là **PM/Compliance**, tôi yêu cầu disclaimer: *số liệu từ hoạt động đăng signal trên site, quá khứ không báo hiệu tương lai, không phải tư vấn đầu tư* — **en + vi**.  
4. Là **user**, tôi có thể **đi tới danh sách signal** (P0: link tới `/signals`; P1: lọc theo tác giả nếu có query/UI).

## UX/UI (đồng bộ design system)

- Vị trí đề xuất: **dưới** block follow/message và **trên** hoặc **dưới** grid follower/following/thread — ưu tiên **dưới tiêu đề + bio**, **trên** stats social (followers…) để “uy tín trading” nổi trước mạng xã hội.  
- Trực quan: **win rate** typography lớn (heading nhỏ), win/loss phụ (`text-muted`), có thể thanh progress hoặc donut **tuỳ UX** (`docs/design-system.md` bổ sung pattern “performance card”).  
- Màu: tránh “xanh lá = chắc chắn kiếm tiền”; ưu tiên **neutral + accent nhẹ**; không trùng màu `CLOSED_WIN`/`CLOSED_LOSS` của signal room nếu gây hiểu nhầm — UX quyết.

## i18n

- Namespace gợi ý: `profile.traderStats` (hoặc `publicProfile.performance`) — mọi chuỗi trong **`messages/en.json`** và **`messages/vi.json`**.

## Hiệu năng & chỉ mục

- Một query aggregate (`groupBy` status hoặc hai `count`) theo `authorId` + `status` — có thể chấp nhận ở MVP.  
- Nếu chậm: thêm `@@index([authorId, status])` trên `Signal` (migration) — Senior Dev đo trước khi thêm.

## Tiêu chí chấp nhận (QA)

- [ ] User có ≥ 5 lệnh đóng win/loss → hiển thị **win rate** đúng công thức (so với tay / SQL).  
- [ ] User có 1–4 lệnh đóng → **không** hiển thị % gây hiểu nhầm; đúng copy đã chốt.  
- [ ] User không có CLOSED_WIN/LOSS → empty state.  
- [ ] `CANCELLED` / `ACTIVE` **không** vào mẫu.  
- [ ] Disclaimer hiển thị trên card; locale `en`/`vi` đúng.  
- [ ] Không lộ email; không truy vấn journal của user khác.

## Handoff

- **UX/UI:** wireframe card + trạng thái ít mẫu / đủ mẫu / zero; cập nhật `docs/design-system.md` (pattern performance card).  
- **Senior Dev:** hàm aggregate hoặc query tối ưu; component RSC trên `u/[userId]/page.tsx`; i18n.  
- **PM:** GitHub Issue epic; nhãn `feature`, `profile`, `signals`, `i18n`.  
- **QA:** seed hoặc staging với user 0 / 3 / 10 lệnh đóng.

---

# Spec — Trang hồ sơ công khai `/u/[userId]`: làm lại UX/UI (P2)

## Bối cảnh

Route: `/[locale]/u/[userId]` (`src/app/[locale]/u/[userId]/page.tsx`). Trang đã có **thẻ performance** (`TraderPerformanceCard`) theo spec *Thẻ uy tín trader*; phần còn lại vẫn mang tính **danh sách dài + header phẳng**, trên **mobile** dễ cảm giác “wall of text” và thiếu **điểm nhìn** (identity) so với các màn social/profile phổ biến.

## Mục tiêu sản phẩm

1. **Nhận diện nhanh:** visitor biết đang xem **ai** (tên + ảnh đại diện nếu có + vai trò “trader trên Social Forex”) trong **một khối** (profile hero / card), không chỉ một dòng H1.
2. **Hành động rõ:** Follow / Nhắn tin / Đăng nhập vẫn nổi; thêm **đường dẫn có ý nghĩa** tới nội dung của **chính user đó** (signals, forum) khi có dữ liệu — tránh CTA chung chung chỉ mở `/signals` không ngữ cảnh.
3. **Mobile & DOM:** giảm cảm giác kéo dài vô tận — **thu gọn / phân trang / “Xem thêm”** cho danh sách follower (và các block danh sách tương lai); skeleton khi tải nếu có phần client-fetch.
4. **SEO & chia sẻ:** `title` / `description` (và tùy chọn OG) phản ánh **tên hiển thị** + “Social Forex”, không để mặc định chung cả site.

## Phạm vi đề xuất (chia nhóm)

### P0 — UX structure & nhận diện

- **Profile header:** layout một cột trên mobile, hai cột trên desktop: **avatar** (fallback chữ cái như danh sách follower), tên, “Member since”, bio; nhóm nút hành động **cùng hàng hoặc stack** rõ ràng (touch target ≥ 44px nếu UX chốt).
- **Thứ tự thông tin (đề xuất PM):** identity + actions → **TraderPerformanceCard** → **số liệu social** (followers / following / threads) → followers list → discovery CTA. *(Điều chỉnh nếu A/B hoặc data cho thấy social proof cần lên trước.)*

### P1 — Nội dung & liên kết theo user

- **Signals:** nút/link “Xem signal của [tên]” trỏ tới `/signals?author=…` với giá trị **ổn định** (vd. tên hiển thị đã trim). Ghi chú kỹ thuật: filter `author` hiện match **name/email contains** — nếu trùng tên giữa user, PM chấp nhận rủi ro hoặc backlog **query `authorId`** (spec riêng).
- **Forum:** nếu `threadCount > 0`, hiển thị link tới forum với filter theo author **nếu** đã có route/query tương ứng; nếu chưa có → chỉ hiển thị số **Threads** + backlog “deep link”.

### P2 — Hiệu năng & polish

- Follower list: giới hạn hiển thị ban đầu (vd. 12) + “Load more” hoặc trang con `/u/[id]/followers` (UX chốt).
- **Skeleton:** `loading.tsx` cho segment `u/[userId]` nếu chuyển sang pattern suspense/partial loading.
- Badge **VIP** (chỉ hiển thị khi policy cho phép lộ trạng thái subscription công khai — cần xác nhận compliance).

## Ngoài phạm vi (không gộp vào epic này)

- Chỉnh sửa **công thức** win rate / `TRADER_STATS_MIN_SAMPLE` (đã có spec riêng).
- Tin nhắn trực tiếp, follow API — chỉ thay **presentation**.

## Rủi ro & giả định

- **Ảnh đại diện:** lấy từ `User.image` (Auth) nếu schema có; không hiển thị email công khai.
- **Trùng tên** khi filter signal theo chuỗi `author`: ghi rõ trong UI hoặc ưu tiên backlog `authorId`.

## Tiêu chí chấp nhận (QA)

- [ ] Mobile (375px): header không vỡ layout; nút không chồng khó bấm.
- [ ] Có avatar hoặc fallback; tên và ngày tham gia đọc được trong 1–2 giây nhìn.
- [ ] CTA tới signal room **có ngữ cảnh** (lọc theo tác giả bằng cơ chế đã chốt) hoặc copy giải thích rõ nếu vẫn link chung.
- [ ] `generateMetadata` (hoặc tương đương App Router) cho `title`/`description` theo locale.
- [ ] `en` + `vi`: mọi chuỗi mới trong namespace `profile` hoặc `common` tùy quy ước.

## Handoff

- **UX/UI:** wireframe mobile + desktop; cập nhật `docs/design-system.md` (pattern **Public profile hero**, spacing, avatar size, section headings).
- **Senior Dev:** refactor `page.tsx` + component tách nhỏ; metadata; i18n; kiểm tra a11y (heading order, alt ảnh).
- **PM:** tách Issue: P0 layout + P1 deep links + P2 list virtualization nếu cần.

---

# PM — Mức độ hài lòng với tính năng hiện tại (feedback & làm rõ)

**Ngày cập nhật:** 2026-04-12  
**Nguồn:** Product owner / PM — *“vẫn chưa hài lòng các tính năng hiện”*.

## 1. Bối cảnh

Sản phẩm đã có **nền tảng đủ dùng** (quotes, calendar, academy, forum, signals, VIP, profile, v.v.) nhưng **chưa đạt kỳ vọng trải nghiệm hoặc giá trị khác biệt** ở một số khối. Tài liệu này **không** kết luận nguyên nhân cụ thể — cần **làm rõ** trước khi phân bổ sprint.

## 2. Khung phân loại “chưa hài lòng” (để chốt ưu tiên)

| Nhóm | Ví dụ biểu hiện | Hướng làm rõ |
|------|-----------------|--------------|
| **Độ sâu (depth)** | Có tính năng nhưng thiếu workflow hoàn chỉnh (vd. signal detail, journal, VIP). | User story + acceptance criteria theo luồng end-to-end. |
| **Độ hoàn thiện (polish)** | UI lệch, copy, hiệu năng (FCP), lỗi edge case. | UX/UI + QA; tiêu chí đo lường (Core Web Vitals, v.v.). |
| **Khác biệt (differentiation)** | Giống công cụ free khác, thiếu “lý do quay lại”. | Định vị sản phẩm + 1–2 killer use case. |
| **Tin cậy & vận hành** | Thanh toán VIP sandbox, cảnh báo lỗi production, nội dung webinar trống. | Roadmap F2/F3 trong `docs/TODO.md`. |
| **Rõ ràng giá trị** | User không hiểu VIP / signal / forum mang lại gì trong 30 giây. | Onboarding, empty state, messaging. |

## 3. Danh mục tính năng hiện có (để gắn mức ưu tiên)

*(Rà nhanh — không phải đánh giá kỹ thuật.)*

- **Công cụ & dữ liệu:** Live quotes, economic calendar, calculators, chart embed, heatmap, sentiment, backtest (Monte Carlo).
- **Nội dung:** Academy, resources, brokers, partners, webinar (có thể empty).
- **Cộng đồng:** Forum, signals (room + detail + ảnh), leaderboard, messages, notifications, follow, public profile `/u/…`.
- **Tài khoản:** Auth, profile, VIP gate, admin (nếu dùng).
- **Vận hành & chất lượng:** SEO, disclaimer, analytics/speed insights (Vercel), CI.

## 4. Câu hỏi PM cần trả lời (trước khi dev lớn)

1. **Khu vực nào** gây thất vọng nhất: *signals / forum / VIP / công cụ / tốc độ / khác*?
2. **Người dùng mục tiêu** ưu tiên trong 1–2 tháng tới: *người mới / trader có kinh nghiệm / người tìm cộng đồng*?
3. **Một** kết quả đo được mong muốn (vd. tăng tỷ lệ đăng ký, tăng signal đóng có ghi nhận, giảm bounce trang chủ)?
4. Có **giới hạn** (thời gian, compliance, không làm payment, v.v.) không?

## 5. Bước tiếp theo (đề xuất quy trình)

1. **Phiên 30–45 phút:** liệt kê top 3 “đau” + top 3 “muốn có” — ghi vào bảng dưới đây (hoặc Issue GitHub).
2. **Cập nhật** mục tương ứng trong `docs/TODO.md` (Giai đoạn F) và **tách epic** có acceptance criteria.
3. **UX/UI** wireframe chỉ cho epic được chọn; **Senior Dev** chỉ sau khi spec chốt.

### Bảng ghi nhanh (PM điền)

| Ưu tiên | Khu vực | Vấn đề / mong muốn | Đo lường thành công (nếu có) |
|--------|---------|---------------------|------------------------------|
| P0 | | | |
| P1 | | | |
| P2 | | | |

## 6. Tham chiếu

- Backlog tổng: `docs/TODO.md` — **Giai đoạn F**.
- Các spec theo màn đã có trong file này (Exness, calendar, signal ảnh, profile public, v.v.).

## 7. Đề xuất ý tưởng (PM — hướng mở rộng giá trị)

*Gợi ý định hướng; chọn 1–2 trục để tránh scatter. Ước lượng effort: **S** nhỏ, **M** trung, **L** lớn.*

### A — “Một vòng lặp” rõ ràng (retention)

| Ý tưởng | Giá trị user | Effort | Ghi chú |
|--------|----------------|--------|---------|
| **Start here → Academy checkpoint** | Người mới biết bước tiếp theo sau mỗi bài. | M | Nối `/start` với bài academy + tick “đã đọc” (local hoặc DB). |
| **Signal watchlist nhẹ** | Từ quotes → “theo dõi cặp này” → feed signal lọc theo watchlist (đã có favorites một phần). | M | Tăng lý do quay lại hàng ngày. |
| **Digest tuần** (email hoặc in-app) | Tóm tắt: lịch nóng, 1 bài academy, 3 thread nổi. | L | Cần nội dung + infra email (đã có backlog F2). |

### B — Độ sâu “social trading” (khác biệt)

| Ý tưởng | Giá trị user | Effort | Ghi chú |
|--------|----------------|--------|---------|
| **Lọc signal theo `authorId`** (URL/API) | Không trùng tên; link profile → đúng từng trader. | M | Spec kỹ thuật riêng; tăng tin cậy. |
| **Bảng “đang follow”** trên dashboard | Một màn chỉ signal từ người đã follow. | M | Giảm nhiễu so với room toàn nền tảng. |
| **Chứng từ uy tín** (profile) | Export ảnh / share card win rate (đã có performance card — thêm OG image). | M | Viral nhẹ, không hứa lợi nhuận. |

### C — Tin cậy & tiền (đã có trong F2)

| Ý tưởng | Giá trị user | Effort | Ghi chú |
|--------|----------------|--------|---------|
| **VIP thanh toán thật** + email nhắc | Giảm ma sát nâng cấp; minh bạch ngày hết hạn. | L | Sandbox → prod; webhook `vipUntil`. |
| **Badge / copy “Educational only”** nhất quán | Giảm hiểu nhầm tư vấn đầu tư. | S | Copy + design system. |

### D — Nội dung & sự kiện (F4)

| Ý tưởng | Giá trị user | Effort | Ghi chú |
|--------|----------------|--------|---------|
| **Webinar** một buổi thật hoặc embed + lịch | Lý do đăng ký / quay lại. | M–L | Đã có backlog. |
| **Chuỗi bài academy** theo chủ đề (risk → session → tin) | Nội dung “có đầu có đuôi”. | S–M | Editorial, không chỉ code. |

### E — Vận hành & chất lượng (F3)

| Ý tưởng | Giá trị user | Effort | Ghi chú |
|--------|----------------|--------|---------|
| **Sentry (hoặc tương đương)** | Lỗi production không “im lặng”. | M | |
| **Staging + smoke checklist** | Giảm regression trước khi ship. | M | |

### Gợi ý chọn 2 trục (nếu chỉ có 1 sprint mạnh)

1. **Trục A + B nhẹ:** “Start → Academy checkpoint” + **authorId** cho signal — vừa retention vừa tin cậy.  
2. **Trục B + F2:** **Follow feed** + **VIP roadmap** — nếu mục tiêu là doanh thu + cộng đồng.  
3. **Trục D + polish:** **Webinar** + **FCP/UX** — nếu mục tiêu là brand và trải nghiệm đầu.

---

# PM — Thu hút người mới (acquisition & activation)

**Ưu tiên chiến lược:** tăng **số người lần đầu** hiểu giá trị sản phẩm và **hoàn thành một hành động có ý nghĩa** (xem dữ liệu thật, xong 1 bài học, hoặc đăng ký sau khi thấy lợi ích) — không ép đăng ký trước khi có “aha moment”.

## 1. Chân dung & giả định

- **Người mới:** tìm **ty giá / lịch / học nhanh**, ngại rủi ro, chưa tin “signal” hay VIP.
- **Giả định:** phần lớn traffic organic / referral; **mobile** đáng kể; **EN + VI** đồng đẳng.

## 2. Thông điệp cốt lõi (30 giây đầu)

- **Một câu:** “Công cụ và bài học cho người mới bắt đầu forex — dữ liệu live, không hype; cộng đồng khi bạn sẵn sàng.”
- **Không** hứa lợi nhuận; **có** disclaimer ngắn gần CTA mạnh.

## 3. Phễu đề xuất

| Giai đoạn | Mục tiêu | Gợi ý sản phẩm (MVP → mở rộng) |
|-----------|----------|----------------------------------|
| **Tìm thấy** | SEO, snippet, OG rõ | Trang chủ + `/start` + academy bài đầu có meta tốt (đã có nền tảng — rà soát title/description theo từ khóa “forex beginner”, “lịch kinh tế”, VN/EN). |
| **Vào trang** | FCP/LCP chấp nhận được | Tiếp tục tối ưu font/script (layout); tránh hero quá nặng. |
| **Giá trị đầu tiên không cần tài khoản** | “Aha” trong 1–2 phút | **Quotes** hoặc **Calendar** hoặc **1 calculator** — CTA rõ: “Học bước tiếp theo” → `/start` hoặc academy bài 1. |
| **Chuyển đăng ký** | Sau khi đã dùng | Form đăng ký nhắc lợi ích: lưu watchlist, forum, signal (copy i18n); không chặn nội dung học thuần. |
| **Kích hoạt ngày 1** | Quay lại | (P2) email digest / nhắc “bài 2 academy”; hoặc banner nhẹ “tiếp tục lộ trình”. |

## 4. Gói MVP đề xuất (chọn 2–3 mục cho sprint đầu)

1. **Trang chủ + `/start`:** một **lộ trình 3 bước** nhìn thấy ngay (vd. Risk → Calendar → Academy) + nút dẫn sâu; đo **click-through** tới `/start` hoặc academy.  
2. **Academy:** **bài đầu** + CTA “bài tiếp theo” luôn hiển thị; empty state thân thiện nếu user chưa đăng nhập.  
3. **Social proof nhẹ:** số người dùng công cụ / “được xây cho người mới” (chỉ khi **có số liệu thật** hoặc copy định tính — không bịa).  
4. **VIP:** không đẩy popup sớm; **một dòng** trên trang chủ hoặc signals: “VIP mở khóa …” + link `/profile` (đã có pattern — thống nhất tone).  

## 5. Chỉ số gợi ý (có thể đo dần)

- **Activation:** % session có ít nhất một trong: xem quotes, xem calendar, mở 1 bài academy.  
- **Intent:** CTR từ trang chủ → `/start` hoặc academy.  
- **Đăng ký:** conversion visit → register (kênh analytics hiện có).  

## 6. Ngoài phạm vi (giai đoạn này)

- Quảng cáo trả phí, influencer (chưa có trong spec).  
- App native.  
- Thay đổi lớn business model (giữ educational positioning).

## 7. Tiêu chí chấp nhận (PM)

- [x] Có **một** luồng “người mới” được mô tả trong copy (trang chủ hoặc `/start`) — EN + VI. *(Section 3 bước trên home + milestone `/start`.)*  
- [x] Không **bắt** đăng nhập để xem quotes/calendar/academy công khai (đúng với positioning hiện tại).  
- [ ] Disclaimer rủi ro **hiển thị** gần CTA mạnh (home/signals) — đã có footer; kiểm tra đủ trên hero nếu thêm CTA broker/signal.  

## 8. Handoff

- **UX/UI:** wireframe trang chủ + `/start` (mobile first); checklist “first session”.  
- **Content:** rà 3–5 từ khóa / snippet cho trang chủ & academy bài 1.  
- **Senior Dev:** chỉ sau khi wireframe + copy chốt; ưu tiên đo sự kiện analytics nếu chưa có.

## 9. SEO & snippet (đã chốt — triển khai trong `messages`)

| Khoá | EN (`home.metaKeywords`) | VI (`home.metaKeywords`) |
|------|---------------------------|----------------------------|
| Trọng tâm | forex beginner, economic calendar, live forex quotes, learn forex, forex risk management, forex academy | forex cho người mới, lịch kinh tế forex, tỷ giá live, học forex, quản lý rủi ro forex, academy forex |

- **Title / description:** `home.metaTitle`, `home.metaDescription` — dùng trong `generateMetadata` trang chủ (`src/app/[locale]/page.tsx`).  
- **`/start`:** giữ `start.metaTitle` / `start.metaDescription` hiện có; bổ sung nội dung **milestone** (bước 1–3) trên UI, không đổi URL.
