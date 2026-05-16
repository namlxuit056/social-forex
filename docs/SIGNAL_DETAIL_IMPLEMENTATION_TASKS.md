# Task Board: Hoàn thiện trang chi tiết Signal

> **Story:** Là trader hoặc viewer, tôi muốn trang chi tiết signal đủ tin cậy, dễ tương tác và rõ đường hành động để có thể đánh giá setup, theo dõi trader, bình luận, ghim signal hoặc nâng cấp VIP khi cần.  
> **Phạm vi:** `src/app/[locale]/signals/[signalId]`, social actions hiện có, i18n EN/VI, SEO metadata.  
> **Ngoài phạm vi:** Thanh toán VIP thật, subscription webhook, redesign toàn bộ Signal Room.

---

## Definition of Done

- [ ] Mỗi signal detail có metadata SEO/Open Graph riêng, gồm title, description, canonical, alternate locale, author, published/modified time.
- [ ] Signal VIP không lộ ảnh chart/setup trong Open Graph khi viewer chưa chắc có quyền xem.
- [ ] Header detail có CTA rõ: hồ sơ trader, follow, nhắn tin, reaction, ghim signal.
- [ ] Signal VIP bị khóa có block upgrade rõ, không chỉ text cảnh báo.
- [ ] Comment section có empty state tốt, login CTA, pending state khi gửi, timestamp theo locale.
- [ ] Reaction button có aria-label/title và trạng thái disabled rõ cho guest.
- [ ] Lịch sử chỉnh sửa signal hiển thị cho viewer được phép xem nội dung, không chỉ tác giả.
- [ ] Lịch sử chỉnh sửa không hiển thị nếu signal VIP đang bị khóa với viewer.
- [ ] Performance stats của tác giả hiển thị trong trang detail.
- [ ] i18n đầy đủ cho `en` và `vi`.
- [ ] `npx tsc --noEmit`, targeted ESLint, JSON parse và `npm test` pass.

---

## Dependency Graph

```text
T001 -> T002 -> T003
T001 -> T004
T001 -> T005
T002 -> T006
T003 -> T007
T004 -> T007
T005 -> T007
T006 -> T007
```

**Song song được:** T003, T004, T005 sau khi T001 xong.

---

## [T001] Audit trang detail và contract hiện có

**Phụ thuộc:** none  
**Files đọc:**  
- `src/app/[locale]/signals/[signalId]/page.tsx`
- `src/app/[locale]/signals/[signalId]/signal-comments.tsx`
- `src/app/[locale]/signals/[signalId]/signal-reactions.tsx`
- `src/actions/signal-social.ts`
- `src/actions/social.ts`
- `src/components/profile/trader-performance-card.tsx`
- `src/components/social/follow-button.tsx`
- `messages/en.json`
- `messages/vi.json`

### Làm gì

- [ ] Xác định dữ liệu signal detail đang query: author, comments, reactions, images, editLogs.
- [ ] Xác định trạng thái quyền xem VIP: `masked`, `canViewVip`, `isAuthor`.
- [ ] Xác nhận đã có action/component nào dùng lại được: follow, pin, message route, trader stats.
- [ ] Đọc docs Next trong `node_modules/next/dist/docs/` về `generateMetadata` vì dự án dùng Next.js 16.

### Tiêu chí hoàn thành

- [ ] Có danh sách file cần chỉnh chính xác.
- [ ] Không tạo component/action mới nếu component/action hiện có đã đủ dùng.

---

## [T002] Nâng metadata SEO/Open Graph cho signal detail

**Phụ thuộc:** T001  
**Files cần đụng:**  
- `src/app/[locale]/signals/[signalId]/page.tsx`

### Làm gì

- [ ] Trong `generateMetadata`, query thêm `createdAt`, `updatedAt`, `author.name`, `author.email`.
- [ ] Metadata trả về:
  - [ ] `title`
  - [ ] `description`
  - [ ] `authors`
  - [ ] `keywords`
  - [ ] `alternates.canonical`
  - [ ] `alternates.languages`
  - [ ] `openGraph.type = "article"`
  - [ ] `openGraph.publishedTime`
  - [ ] `openGraph.modifiedTime`
  - [ ] `openGraph.authors`
  - [ ] `openGraph.tags`
  - [ ] `twitter`
- [ ] Chỉ dùng ảnh signal làm OG image khi signal là `FREE`.
- [ ] Giữ fallback title nếu signal không tồn tại.

### Tiêu chí hoàn thành

- [ ] `npx tsc --noEmit` không lỗi metadata type.
- [ ] Signal VIP không đưa `images[0].url` vào OG metadata.

---

## [T003] Thêm CTA rõ trong header signal detail

**Phụ thuộc:** T001  
**Files cần đụng:**  
- `src/app/[locale]/signals/[signalId]/page.tsx`
- `messages/en.json`
- `messages/vi.json`

### Làm gì

- [ ] Import và dùng `FollowButton`.
- [ ] Query trạng thái follow hiện tại bằng `prisma.userFollow.findUnique`.
- [ ] Nếu viewer không phải author:
  - [ ] Hiển thị link hồ sơ trader `/u/{authorId}`.
  - [ ] Nếu đã login, hiển thị follow/unfollow.
  - [ ] Nếu đã login, hiển thị link nhắn tin `/messages/{authorId}`.
- [ ] Giữ reaction, pin và share hiện có.
- [ ] Thêm i18n keys:
  - [ ] `signals.authorProfile`
  - [ ] `signals.messageAuthor`

### Tiêu chí hoàn thành

- [ ] Guest không thấy CTA nhắn tin/follow cần đăng nhập.
- [ ] Author không thấy CTA follow/message chính mình.
- [ ] Button/link có icon, nhãn và kích thước tap target hợp lý.

---

## [T004] Cải thiện VIP locked state

**Phụ thuộc:** T001  
**Files cần đụng:**  
- `src/app/[locale]/signals/[signalId]/page.tsx`
- `messages/en.json`
- `messages/vi.json`

### Làm gì

- [ ] Thay dòng `maskedMessage` đơn lẻ bằng block cảnh báo có icon khóa.
- [ ] Thêm CTA đến `/upgrade-vip`.
- [ ] Không render trade levels, notes, image URLs thật khi `masked = true`.
- [ ] Thêm i18n keys:
  - [ ] `signals.maskedTitle`
  - [ ] `signals.upgradeVipCta`

### Tiêu chí hoàn thành

- [ ] Viewer không VIP không thấy entry/SL/TP/notes/images của signal VIP.
- [ ] CTA nâng cấp VIP rõ trên desktop và mobile.

---

## [T005] Nâng comment và reaction UX

**Phụ thuộc:** T001  
**Files cần đụng:**  
- `src/app/[locale]/signals/[signalId]/signal-comments.tsx`
- `src/app/[locale]/signals/[signalId]/signal-reactions.tsx`
- `src/app/[locale]/signals/[signalId]/page.tsx`
- `messages/en.json`
- `messages/vi.json`

### Làm gì

- [ ] `SignalComments` nhận thêm `locale`.
- [ ] Format timestamp bằng `toLocaleString(locale)`.
- [ ] Empty state có title, hint riêng cho logged-in và guest.
- [ ] Guest thấy link đăng nhập thay vì text tĩnh.
- [ ] Submit comment dùng `useFormStatus()` để có pending state đúng theo form.
- [ ] Reaction buttons có `aria-label` và `title`.
- [ ] Guest reaction disabled hiển thị copy `loginToReact`.
- [ ] Thêm i18n keys:
  - [ ] `signals.noCommentsTitle`
  - [ ] `signals.noCommentsHint`
  - [ ] `signals.noCommentsLoginHint`
  - [ ] `signals.commentPosting`
  - [ ] `signals.loginToReact`

### Tiêu chí hoàn thành

- [ ] Empty comments không còn chỉ là một dòng trống trải.
- [ ] Form comment có trạng thái đang gửi.
- [ ] Không hardcode chuỗi tiếng Anh trong client component.

---

## [T006] Hiển thị edit history và stats tác giả

**Phụ thuộc:** T001, T002  
**Files cần đụng:**  
- `src/app/[locale]/signals/[signalId]/page.tsx`

### Làm gì

- [ ] Đổi điều kiện edit history từ chỉ author sang viewer được phép xem nội dung:
  - [ ] Hiển thị nếu `!masked && signal.editLogs.length > 0`.
  - [ ] Không hiển thị nếu `masked = true`.
- [ ] Giữ giới hạn `take: 40`.
- [ ] Gắn `TraderPerformanceCard` dưới news context hoặc trước comments.
- [ ] CTA stats trỏ về Signal Room với filter author phù hợp.

### Tiêu chí hoàn thành

- [ ] Viewer thường thấy edit history của signal free nếu có log.
- [ ] Viewer không VIP không thấy edit history của signal VIP bị khóa.
- [ ] Stats tác giả hiển thị đúng empty/insufficient/win-rate theo component hiện có.

---

## [T007] Verification

**Phụ thuộc:** T002, T003, T004, T005, T006  
**Files cần đụng:** none

### Lệnh chạy

```bash
npx tsc --noEmit
node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); JSON.parse(require('fs').readFileSync('messages/vi.json','utf8')); console.log('messages ok')"
npx eslint 'src/app/[locale]/signals/[signalId]/page.tsx' 'src/app/[locale]/signals/[signalId]/signal-comments.tsx' 'src/app/[locale]/signals/[signalId]/signal-reactions.tsx' src/actions/signal-social.ts
npm test
```

### Kiểm tra thủ công

- [ ] Guest xem signal free: thấy levels, comments, stats, reaction disabled, login CTA.
- [ ] Guest xem signal VIP: không thấy levels/notes/images/edit history, thấy upgrade CTA.
- [ ] User thường xem signal free: follow/message/pin/reaction/comment hoạt động.
- [ ] Author xem signal của mình: thấy edit/close/share, không thấy follow/message chính mình.
- [ ] User VIP xem signal VIP: thấy nội dung và edit history nếu có.
- [ ] Mobile viewport khoảng 390px: header action không vỡ layout.

### Ghi chú lint toàn repo

Nếu `npm run lint` toàn repo fail do thư mục ngoài phạm vi như `.claude`, `.cursor`, `.history` hoặc lỗi cũ không liên quan, ghi rõ trong handoff và dùng targeted ESLint cho các file thay đổi.

