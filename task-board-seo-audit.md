# Task Board: Sửa các lỗi SEO từ audit toolforex.xyz

> **Story:** Sửa 8 vấn đề SEO phát hiện khi audit bằng agent-browser (2026-11-06)
> **Tổng estimate:** ~11 giờ
> **Ngày tạo:** 2026-11-06

---

## Trạng thái (cập nhật 2026-11-06)

| Task | Trạng thái | Ghi chú |
|---|---|---|
| T001 | ✅ code | Middleware redirect 301 khi `x-forwarded-proto: http`. Vẫn nên bật *Always Use HTTPS* trên Cloudflare |
| T002 | ⏭ bỏ | ISR 60s đã giới hạn query DB còn khoảng 1 lần/phút, không cần `unstable_cache` |
| T003 | ✅ | `HeaderSessionArea` + `SessionExtras` (client), `/api/me` |
| T004 | ✅ code · ⏳ Cloudflare | Trang chủ và `/quotes` là ISR 60s. Còn phải tạo Cache Rule trên Cloudflare |
| T005 | ✅ | `metaTitle`/`metaDescription` cho academy, calendar; calendar có hreflang |
| T006 | ✅ | BreadcrumbList ×3, ItemList cho academy, kèm test |
| T007 | ✅ | `title.absolute` |
| T008 | ⏳ TODO | Chờ chốt từ khóa chính |
| T009 | ✅ | Bỏ og:url ở layout; sitemap `https://toolforex.xyz/` |
| T010 | ✅ | 2 link "View…" và link Telegram ở footer: `min-h-6` |
| T011 | ✅ deploy · ⏳ test đăng nhập | Đã deploy 2026-11-06. Server gốc 3–14ms; công khai 0.67–0.82s (trước 1.5–2.5s), phần còn lại là độ trễ mạng qua tunnel, chưa test luồng đăng nhập |

**Thay đổi ngoài kế hoạch (phát hiện khi build):**
- Root layout `src/app/layout.tsx` gọi `getLocale()`, hàm này đọc `headers()`, nên mọi trang đều bị render động. Đã xóa file này và chuyển `<html>` vào `src/app/[locale]/layout.tsx` (theo cách Next 16 hướng dẫn).
- `fetch-tv-ratings.ts` dùng `next: { revalidate: 0 }` khiến trang chủ bị render động. Đã bỏ (mặc định fetch đã không cache; hàm gọi đã có cache TTL 5 phút).
- `NEXT_LOCALE` Set-Cookie chặn Cloudflare cache HTML. Đã đặt `localeCookie: false`; cookie này không được đọc ở đâu cả, vì `localeDetection` đang là `false`.
- Sau khi bỏ root layout động, 11 trang trở thành tĩnh. Chỉ `/quotes` lấy dữ liệu lúc render nên được thêm `revalidate = 60`. 10 trang còn lại không có dữ liệu server.

---

## Bối cảnh (số liệu đo lúc audit)

| Chỉ số | Hiện tại | Mục tiêu |
|---|---|---|
| TTFB trang chủ | 1.5–2.5s | < 0.8s |
| LCP trang chủ | 2.6s (phần tử LCP là `h1`) | < 2.5s |
| `cache-control` trang chủ | `private, no-cache, no-store` | `s-maxage=60, stale-while-revalidate` |
| `cf-cache-status` | `DYNAMIC` | `HIT` |
| `http://toolforex.xyz/` | 200, không redirect | 301 → `https://` |
| Độ dài description `/academy` · `/calendar` | 46 · 54 ký tự | 120–160 ký tự |
| JSON-LD trên `/academy`, `/calendar`, `/quotes` | 0 | ≥ 1 (BreadcrumbList) |

**Nguyên nhân gốc của TTFB cao:**
- `src/app/[locale]/layout.tsx` và `src/components/layout/site-header.tsx` đều gọi `auth()`. Hàm này đọc cookie, nên **mọi trang** bị render động.
- Header còn query Prisma trên mỗi request: lấy user và đếm notification chưa đọc.
- Trang chủ còn chạy thêm 2 component query DB là `HomeTopTraders` và `SignalDirectionsBoard`.
- Cloudflare mặc định không cache HTML, nên kể cả khi origin trả `s-maxage` thì vẫn cần một Cache Rule.

**Phát hiện thêm khi đọc code:**
- `openGraph.url` được đặt cứng ở layout là `getSiteUrl()`. Vì vậy **mọi trang con đều khai báo og:url là trang chủ**, chứ không riêng gì chuyện dấu `/`. Đã gộp vào T009.
- `/calendar` chỉ có canonical, thiếu hreflang. Đã gộp vào T005.

---

## Definition of Done

- [ ] `curl -I http://toolforex.xyz/` trả 301 về `https://toolforex.xyz/`
- [ ] TTFB trang chủ dưới 0.8s (đo `curl -w %{time_starttransfer}` 3 lần, khi cache đang ấm)
- [ ] Trang chủ trả `cache-control` có `s-maxage`, Cloudflare trả `cf-cache-status: HIT` từ lần gọi thứ 2
- [ ] User đã đăng nhập vẫn thấy đúng avatar, badge notification, BottomAppNav và MoodCheckinNudge; không bị lộ HTML của user khác qua cache
- [ ] `/academy` và `/calendar` có title riêng cho SEO, description 120–160 ký tự, đủ cả `vi` và `en`
- [ ] `/academy`, `/calendar`, `/quotes` có JSON-LD `BreadcrumbList` hợp lệ (qua Rich Results Test)
- [ ] Title trang chủ không lặp "Social Forex"
- [ ] `og:url` của mỗi trang bằng canonical của chính trang đó
- [ ] Không còn link hay nút nào nhỏ hơn 24×24px trên viewport 390px
- [ ] `npm run lint`, `npm test`, `npm run build` đều pass

---

## Dependency Graph

```
T001 (Cloudflare HTTPS) ──────────────────────────────┐
                                                      │
T002 (cache DB trang chủ) ─┐                          │
                           ├→ T004 (ISR + CF cache) ──┤
T003 (bỏ auth() khỏi SSR) ─┘                          │
                                                      ├→ T011 (verify)
T005 (meta trang con) ─┐                              │
T006 (JSON-LD trang con)┼─────────────────────────────┤
T007 (title trang chủ) ─┤                             │
T009 (og:url) ──────────┘                             │
T008 (H1 ↔ keyword, cần chốt keyword) ────────────────┤
T010 (tap target) ────────────────────────────────────┘
```

**Song song được:** T001, T002, T003, T005, T006, T007, T009, T010 độc lập với nhau. Chỉ T004 phải chờ T002 và T003.

**Thứ tự đề xuất:** T001 (5 phút, hiệu quả ngay) → T007 + T009 + T005 (nhanh) → T002 → T003 → T004 → T006 → T010 → T008 → T011

---

## [T001] Bật redirect HTTP → HTTPS trên Cloudflare

**Ưu tiên:** Cao
**Phụ thuộc:** (none)
**Files cần đụng:** (không có code; thao tác trên Cloudflare dashboard)
**Ước tính:** 0.1h

### Làm gì
- [ ] Vào Cloudflare → `toolforex.xyz` → SSL/TLS → Edge Certificates → bật **Always Use HTTPS**
- [ ] Bật luôn **Automatic HTTPS Rewrites**

### Kiểm tra
- [ ] `curl -sI http://toolforex.xyz/` trả `301` kèm `location: https://toolforex.xyz/`
- [ ] `curl -sI http://www.toolforex.xyz/` cũng redirect về `https://toolforex.xyz/`

> Ghi chú: Cloudflare Tunnel (`sf-tunnel`) nhận cả http lẫn https ở edge, nên phải redirect từ phía Cloudflare. Không sửa được bằng middleware Next.

---

## [T002] Cache các query DB của trang chủ

**Ưu tiên:** Cao
**Phụ thuộc:** (none)
**Files cần đụng:**
- `src/components/home/home-top-traders.tsx`
- `src/components/home/signal-directions-board.tsx`
**Ước tính:** 1h

### Làm gì
- [ ] Bọc `prisma.signal.findMany` trong `HomeTopTraders` bằng `unstable_cache`, key `["home-top-traders"]`, `revalidate: 300`, tag `signals`
- [ ] Bọc 2 query `prisma.notification.findMany` và `prisma.signalOutcome.findMany` trong `SignalDirectionsBoard` bằng `unstable_cache`, `revalidate: 60`, tag `signals`
- [ ] Không đưa `nowIso` vào cache key. Nếu query lọc theo thời gian thì làm tròn thời gian về phút trước khi truyền vào
- [ ] Đọc `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md` trước khi code, vì Next 16 có thay đổi API
- [ ] TODO: kiểm tra action tạo signal hoặc outcome có gọi `revalidateTag("signals")` chưa; nếu chưa thì thêm

### Kiểm tra
- [ ] Dev: request thứ 2 không còn log query Prisma của 2 component này
- [ ] Số liệu Top Traders và Signal Directions vẫn đúng như trước

---

## [T003] Bỏ `auth()` khỏi phần render server dùng chung

**Ưu tiên:** Cao (đây là gốc của `no-store`)
**Phụ thuộc:** (none)
**Files cần đụng:**
- `src/app/[locale]/layout.tsx`: bỏ `await auth()`
- `src/components/layout/site-header.tsx`: bỏ `auth()` và 2 query Prisma
- `src/components/layout/header-user-menu.tsx`: **tạo mới**, client component
- `src/app/api/me/route.ts`: **tạo mới**, trả `{ user, isStaff, unreadCount }`
- `src/components/layout/bottom-app-nav.tsx`, `src/components/journal/mood-checkin-nudge.tsx`: tự check session
**Ước tính:** 4h

### Làm gì
- [ ] Tạo `/api/me` chứa phần query đang nằm ở `site-header.tsx` (dòng 29–45): lấy user, `isStaff`, số notification chưa đọc. Trả header `cache-control: private, no-store`
- [ ] Tạo `HeaderUserMenu` (client): dùng `useSession()` để biết đã đăng nhập chưa (`SessionProvider` đã có sẵn trong `app-providers.tsx`), gọi `/api/me` để lấy badge và `isStaff`
- [ ] Khi chưa có session: render nút Đăng nhập / Đăng ký giống hiện tại. Khi đang tải: hiện skeleton cùng kích thước để giữ CLS = 0
- [ ] `MobileNav` nhận `isStaff` và `isAuthenticated` từ client thay vì từ server
- [ ] Layout render `BottomAppNav` và `MoodCheckinNudge` vô điều kiện. Hai component này tự `useSession()` và trả `null` nếu chưa đăng nhập
- [ ] Các trang cần auth thật (`/dashboard`, `/journal`…) vẫn giữ `auth()` ở page của chúng, không đụng tới
- [ ] Tìm thêm chỗ khác trong layout dùng chung có gọi `cookies()` hay `headers()` (`grep -rn "cookies()\|headers()" src/components/layout`)

### Kiểm tra
- [ ] Đăng nhập rồi reload: avatar, badge, BottomAppNav và nudge vẫn hiện đúng
- [ ] Đăng xuất: header hiện nút Đăng nhập, không bị nháy giao diện của user cũ
- [ ] `npm run build`: route `/[locale]` không còn bị đánh dấu `ƒ (Dynamic)` chỉ vì layout

> Rủi ro: badge notification sẽ hiện chậm hơn khoảng 100–300ms vì phải đợi `/api/me`. Đổi lại, HTML trang chủ được cache.

---

## [T004] Bật ISR cho trang chủ và cache HTML trên Cloudflare

**Ưu tiên:** Cao
**Phụ thuộc:** T002, T003
**Files cần đụng:**
- `src/app/[locale]/page.tsx`
- `src/components/market/market-volatility-note.tsx` (nếu phụ thuộc `serverNowIso`)
- Cloudflare dashboard → Caching → Cache Rules
**Ước tính:** 1.5h

### Làm gì
- [ ] Thêm `export const revalidate = 60` vào `src/app/[locale]/page.tsx`
- [ ] `nowIso` (dòng 131) sẽ bị "đóng băng" trong 60s. Kiểm tra `MarketVolatilityNote` và `SignalDirectionsBoard`; phần nào cần thời gian thật thì tính lại ở client
- [ ] Kiểm tra response trang chủ có `cache-control: s-maxage=60, stale-while-revalidate`
- [ ] Tạo Cloudflare Cache Rule: hostname `toolforex.xyz`, path `/` hoặc `/vi`, không có cookie `authjs.session-token` → *Eligible for cache*, Edge TTL lấy theo origin
- [ ] Rule phải **bỏ qua cache khi có cookie session** để không trả nhầm HTML (phòng hờ dù T003 đã tách phần user)
- [ ] Cookie `NEXT_LOCALE` do middleware set có thể chặn Cloudflare cache; kiểm tra và tắt set cookie ở route trang chủ nếu cần (TODO: xác nhận hành vi của next-intl khi `localeDetection: false`)

### Kiểm tra
- [ ] `curl -sI https://toolforex.xyz/` gọi 2 lần: lần 2 có `cf-cache-status: HIT`
- [ ] TTFB dưới 0.8s; `agent-browser vitals` cho LCP dưới 2.5s

---

## [T005] Viết meta title và description riêng cho trang con

**Ưu tiên:** Trung bình
**Phụ thuộc:** (none)
**Files cần đụng:**
- `messages/en.json`, `messages/vi.json`: namespace `academy`, `calendar`
- `src/app/[locale]/academy/page.tsx`
- `src/app/[locale]/calendar/page.tsx`
**Ước tính:** 1h

### Làm gì
- [ ] Key `title` và `description` hiện đang dùng cho cả heading trên trang, nên **không sửa trực tiếp**. Thêm key mới `metaTitle` và `metaDescription` cho cả 2 namespace, ở cả vi và en
- [ ] Gợi ý nội dung (cần chốt lại câu chữ):
  - `academy.metaTitle` vi: "Học Forex miễn phí từ cơ bản đến nâng cao — Academy"; en: "Free Forex Course for Beginners to Advanced — Academy"
  - `academy.metaDescription`: 120–160 ký tự, nhắc tới quản lý vốn, price action, bài học miễn phí
  - `calendar.metaTitle` vi: "Lịch kinh tế Forex hôm nay — giờ Việt Nam"; en: "Forex Economic Calendar Today — Live Events"
  - `calendar.metaDescription`: 120–160 ký tự, nhắc tới NFP, CPI, lãi suất Fed, múi giờ VN/UTC
- [ ] `generateMetadata` của 2 trang đọc `metaTitle` và `metaDescription`
- [ ] `/calendar`: đổi `alternates: { canonical }` thành `alternates: localeAlternates("/calendar", locale)` để có hreflang
- [ ] Rà nhanh các route khác trong `staticPaths` của `src/app/sitemap.ts`; route nào có description dưới 100 ký tự thì ghi vào backlog

### Kiểm tra
- [ ] `vi.json` và `en.json` có đủ key giống nhau
- [ ] Title render ra dưới 60 ký tự (đã tính cả hậu tố ` · Social Forex`)

---

## [T006] Thêm JSON-LD cho trang con

**Ưu tiên:** Trung bình
**Phụ thuộc:** (none)
**Files cần đụng:**
- `src/app/[locale]/academy/page.tsx`
- `src/app/[locale]/calendar/page.tsx`
- `src/app/[locale]/quotes/page.tsx`
- `src/components/seo/item-list-json-ld.tsx`: **tạo mới**
- `src/lib/json-ld.ts` + `src/lib/json-ld.test.ts`: thêm hàm thuần `buildItemList`
**Ước tính:** 1.5h

### Làm gì
- [ ] Thêm `<BreadcrumbJsonLd>` (component đã có ở `src/components/seo/breadcrumb-json-ld.tsx`) cho 3 trang: Home → Academy / Economic Calendar / Live Quotes
- [ ] `/academy`: thêm `ItemList` gồm các bài học (tên + URL `/academy/[slug]`). Không dùng `Course`, vì Google bắt buộc `provider` và `offers`, dễ bị lỗi
- [ ] Hàm `buildItemList(items, locale)` là hàm thuần, có unit test, và dùng `jsonLdHtml` để escape
- [ ] Không thêm `Event` cho `/calendar` (Google không hỗ trợ rich result cho sự kiện kinh tế)

### Kiểm tra
- [ ] Rich Results Test / Schema Validator không báo lỗi cho cả 3 URL
- [ ] `npx vitest run src/lib/json-ld.test.ts` pass

---

## [T007] Bỏ hậu tố thương hiệu bị lặp ở title trang chủ

**Ưu tiên:** Thấp
**Phụ thuộc:** (none)
**Files cần đụng:** `src/app/[locale]/page.tsx`
**Ước tính:** 0.1h

### Làm gì
- [ ] Trong `generateMetadata` của trang chủ, đổi `title: t("metaTitle")` thành `title: { absolute: t("metaTitle") }` để bỏ qua template `%s · Social Forex` của layout

### Kiểm tra
- [ ] `<title>` trang chủ là "Social Forex — tools & lessons for new forex traders", không còn `· Social Forex` ở cuối

---

## [T008] Thống nhất H1 trang chủ với từ khóa chính

**Ưu tiên:** Thấp
**Phụ thuộc:** (none). **Cần chủ dự án chốt từ khóa chính**
**Files cần đụng:** `messages/en.json`, `messages/vi.json` (namespace `home`)
**Ước tính:** 0.5h

### Làm gì
- [ ] TODO (business): chốt trang chủ nhắm vào từ khóa nào:
  - (a) "forex tools & lessons for beginners", tức giữ title, đổi H1
  - (b) "XAUUSD demo 7 ngày", tức đổi title và description theo H1
- [ ] Sửa key tương ứng ở cả vi và en sao cho H1 và title cùng chứa từ khóa chính
- [ ] Nếu chọn (a): đưa câu "Practice XAUUSD demo 7 days…" xuống làm subtitle hoặc H2

### Kiểm tra
- [ ] H1 và `<title>` có chung cụm từ khóa chính

---

## [T009] Sửa og:url cho đúng từng trang và thống nhất dạng URL

**Ưu tiên:** Thấp (nhưng phạm vi rộng: ảnh hưởng mọi trang)
**Phụ thuộc:** (none)
**Files cần đụng:**
- `src/app/[locale]/layout.tsx`
- `src/app/sitemap.ts`
**Ước tính:** 0.5h

### Làm gì
- [ ] Bỏ `url: getSiteUrl()` khỏi `openGraph` ở layout. Thêm `metadataBase: new URL(getSiteUrl())` và `openGraph.url: "./"` để Next tự resolve theo path của từng trang (đọc `node_modules/next/dist/docs` phần `generateMetadata` để xác nhận cách resolve URL tương đối ở Next 16)
- [ ] Nếu cách trên không chạy: trong mỗi `generateMetadata` của trang, đặt `openGraph.url` bằng canonical
- [ ] Sitemap: URL trang chủ phải trùng chính xác với canonical sau khi render (hiện canonical có dấu `/`, sitemap thì không). Cho entry `path: ""` xuất `${BASE}/`

### Kiểm tra
- [ ] `og:url` của `/academy` là `https://toolforex.xyz/academy`
- [ ] Trang chủ: canonical, og:url và `<loc>` trong sitemap trùng nhau từng ký tự

---

## [T010] Tăng kích thước tap target trên mobile

**Ưu tiên:** Thấp
**Phụ thuộc:** (none)
**Files cần đụng:** chưa biết, cần xác định 3 phần tử trước
**Ước tính:** 0.5h

### Làm gì
- [ ] Tìm phần tử nhỏ: `agent-browser set viewport 390 844`, mở trang chủ, rồi `eval` lọc `a,button` có `getBoundingClientRect()` dưới 24px và in ra `outerHTML`
- [ ] Thêm `min-h-6 min-w-6`, hoặc padding cho vùng chạm (có thể dùng pseudo-element để không đổi layout)

### Kiểm tra
- [ ] Chạy lại script: 0 phần tử dưới 24px

---

## [T011] Kiểm tra tổng và audit lại

**Phụ thuộc:** T001–T010
**Ước tính:** 0.5h

### Làm gì
- [ ] `npm run lint && npm test && npm run build`
- [ ] Deploy (`npm run selfhost:restart`), sau đó chạy lại audit bằng agent-browser: meta, JSON-LD, vitals, mobile
- [ ] Đối chiếu từng mục trong Definition of Done
- [ ] Google Search Console: gửi lại sitemap, yêu cầu index lại `/`, `/academy`, `/calendar`
- [ ] Commit theo conventional commits (ví dụ `perf(home): enable ISR and move session UI client-side`, `fix(seo): …`) rồi push lên `main`
