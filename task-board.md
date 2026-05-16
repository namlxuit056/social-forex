# Task Board: Cho phép user pin signal lên profile

> **Story:** Cho phép user pin signal lên profile  
> **Tổng estimate:** ~7.25 giờ  
> **Ngày tạo:** 2026-05-16

---

## Definition of Done

- [ ] User đã đăng nhập có thể pin/unpin bất kỳ signal nào vào profile (tối đa 6 signal)
- [ ] Nút Pin/Unpin hiển thị trên trang chi tiết signal (`/signals/[signalId]`) với người dùng đã đăng nhập
- [ ] Trang public profile (`/u/[userId]`) hiển thị section "Tín hiệu đã ghim" với tối đa 6 signal theo thứ tự `sortOrder`
- [ ] Signal tier VIP vẫn bị che với viewer không có VIP (không phải chủ profile)
- [ ] Không thể pin quá 6 signal — action trả về error rõ ràng
- [ ] Race condition (2 request đồng thời) được xử lý an toàn bằng DB unique constraint + try/catch `P2002`
- [ ] Signal bị xóa → tự động xóa khỏi danh sách pin (cascade)
- [ ] i18n đầy đủ cho cả `vi` và `en`
- [ ] Unit test bao phủ logic giới hạn pin (`isAtPinLimit`)

---

## Dependency Graph

```
T001 → T002 → T003 → T004 ┐
                      ↘    ↓
                       T006 → T007 ┐
                      ↗            ↓
                 T005              T009
               ↗
T003 → T008 ─────────────────────→ T010
```

**Song song được:** T004 & T005 (sau T003) | T007 & T008 (sau T005 & T006)

---

## [T001] Thêm model UserPinnedSignal vào Prisma schema

**Phụ thuộc:** (none)
**Files cần đụng:** `prisma/schema.prisma`
**Ước tính:** 0.5h

### Làm gì
- [ ] Thêm model `UserPinnedSignal` với các field: `id` (cuid), `userId`, `signalId`, `sortOrder` (default 0), `createdAt`
- [ ] Thêm `pinnedSignals UserPinnedSignal[]` vào model `User`
- [ ] Thêm `pinnedBy UserPinnedSignal[]` vào model `Signal`
- [ ] FK `userId`: `onDelete: Cascade`; FK `signalId`: `onDelete: Cascade`
- [ ] Thêm `@@unique([userId, signalId])`
- [ ] Thêm `@@index([userId, sortOrder])`

### Tiêu chí hoàn thành
- [ ] `npx prisma validate` không báo lỗi

---

## [T002] Tạo migration SQL cho bảng UserPinnedSignal

**Phụ thuộc:** T001
**Files cần đụng:** `prisma/migrations/20260516120000_user_pinned_signals/migration.sql`
**Ước tính:** 0.5h

### Làm gì
- [ ] Tạo thư mục `prisma/migrations/20260516120000_user_pinned_signals/`
- [ ] Viết `migration.sql`: `CREATE TABLE`, `CREATE UNIQUE INDEX` trên `(userId, signalId)`, `CREATE INDEX` trên `(userId, sortOrder)`, 2 `ALTER TABLE ADD CONSTRAINT` FK với `ON DELETE CASCADE`
- [ ] Chạy `npm run db:migrate`

### Tiêu chí hoàn thành
- [ ] Migration apply thành công, không lỗi
- [ ] Bảng `UserPinnedSignal` xuất hiện đúng cấu trúc trong DB

---

## [T003] Regenerate Prisma client sau migration

**Phụ thuộc:** T002
**Files cần đụng:** `src/generated/prisma/` (tự động)
**Ước tính:** 0.25h

### Làm gì
- [ ] Chạy `npm run db:generate`
- [ ] Xác nhận `index.d.ts` có type `userPinnedSignal` và methods `prisma.userPinnedSignal.*`

### Tiêu chí hoàn thành
- [ ] `npx tsc --noEmit` không báo lỗi TypeScript liên quan đến model mới

---

## [T004] Tạo utility pin-signal-limit và unit test

**Phụ thuộc:** T003 | *Song song với T005*
**Files cần đụng:** `src/lib/signals/pin-signal-limit.ts`, `src/lib/signals/pin-signal-limit.test.ts`
**Ước tính:** 0.5h

### Làm gì
- [ ] Tạo `pin-signal-limit.ts`: export `MAX_PINS = 6` và `isAtPinLimit(count: number): boolean`
- [ ] Tạo `pin-signal-limit.test.ts` với 3 test cases:
  - [ ] `isAtPinLimit(5)` → `false`
  - [ ] `isAtPinLimit(6)` → `true`
  - [ ] `isAtPinLimit(7)` → `true`

### Tiêu chí hoàn thành
- [ ] `npx vitest run src/lib/signals/pin-signal-limit.test.ts` — 3/3 PASS

---

## [T005] Thêm i18n keys cho tính năng pin signal

**Phụ thuộc:** T003 | *Song song với T004*
**Files cần đụng:** `messages/en.json`, `messages/vi.json`
**Ước tính:** 0.5h

### Làm gì
- [ ] **`en.json`** — thêm vào namespace `errors`:
  - [ ] `pinLimitReached`: `"You can pin up to 6 signals."`
- [ ] **`en.json`** — thêm vào namespace `profile`:
  - [ ] `pinnedSignals`, `pinnedSignalsEmpty`, `pinSignal`, `unpinSignal`
  - [ ] `pinLimitReachedHint` (có param `{max}`)
  - [ ] `pinSignalAria`, `unpinSignalAria` (có param `{symbol}`)
- [ ] **`vi.json`** — thêm sync 1-1 với en.json:
  - [ ] `errors.pinLimitReached`: `"Bạn chỉ có thể ghim tối đa 6 tín hiệu."`
  - [ ] Tất cả key namespace `profile` tương tự

### Tiêu chí hoàn thành
- [ ] Hai file có cùng số key mới, không thiếu key nào

---

## [T006] Thêm server action `togglePinSignal`

**Phụ thuộc:** T004, T005
**Files cần đụng:** `src/actions/signal-social.ts`
**Ước tính:** 1.5h

### Làm gì
- [ ] Thêm `export async function togglePinSignal(formData: FormData)` với `"use server"` ở file
- [ ] Import `MAX_PINS` từ `@/lib/signals/pin-signal-limit`
- [ ] **Auth:** `auth()` → redirect `/auth/signin` nếu chưa login
- [ ] **Rate limit:** `rateLimit('sig-pin:' + userId, 20, 60000)`
- [ ] **Zod validate:** `signalId` là string không rỗng
- [ ] **Check signal tồn tại:** `findUnique` — trả `{ok:false, error:'notFound'}` nếu null
- [ ] **Check existing pin:** `findUnique({where:{userId_signalId:{userId,signalId}}})`
  - [ ] Nếu có → `delete` → `revalidatePath('/u/' + userId)` → return `{ok:true, pinned:false}`
  - [ ] Nếu không → `count({where:{userId}})`
    - [ ] `count >= MAX_PINS` → return `{ok:false, error:'pinLimitReached'}`
    - [ ] `create({...sortOrder:count})` trong `try/catch`
    - [ ] Catch Prisma error `P2002` → return `{ok:true, pinned:true}`
    - [ ] Success → `revalidatePath('/u/' + userId)` → return `{ok:true, pinned:true}`

### Tiêu chí hoàn thành
- [ ] `npx tsc --noEmit` không lỗi
- [ ] Test thủ công: pin → unpin → pin lại hoạt động đúng

---

## [T007] Tạo client component `PinSignalButton`

**Phụ thuộc:** T005, T006 | *Song song với T008*
**Files cần đụng:** `src/components/signals/pin-signal-button.tsx`
**Ước tính:** 1h

### Làm gì
- [ ] `"use client"` ở dòng đầu
- [ ] Props: `signalId: string`, `signalSymbol: string`, `isPinned: boolean`, `loggedIn: boolean`, `atLimit: boolean`
- [ ] Return `null` nếu `!loggedIn`
- [ ] `<form action={togglePinSignal}>` + `<input type="hidden" name="signalId" value={signalId}>`
- [ ] `<Button variant="outline" size="sm">`:
  - [ ] Icon `Pin` (lucide-react) khi chưa pin, `PinOff` khi đã pin
  - [ ] Text từ `profile.pinSignal` / `profile.unpinSignal`
  - [ ] `disabled` khi `!isPinned && atLimit`
  - [ ] Class màu amber khi `isPinned`
  - [ ] `aria-label` từ `pinSignalAria` / `unpinSignalAria` với param `symbol`
- [ ] `title={t('profile.pinLimitReachedHint', {max: MAX_PINS})}` khi `atLimit && !isPinned`

### Tiêu chí hoàn thành
- [ ] TypeScript không lỗi
- [ ] Render đúng 3 state: chưa pin, đã pin, at-limit

---

## [T008] Tạo server component `PinnedSignalsSection`

**Phụ thuộc:** T003, T005 | *Song song với T007*
**Files cần đụng:** `src/components/profile/pinned-signals-section.tsx`
**Ước tính:** 1.5h

### Làm gì
- [ ] Async server component (không có `"use client"`)
- [ ] Props: `profileUserId: string`, `viewerVipUntil: Date | null | undefined`, `viewerUserId: string | undefined`
- [ ] Query `prisma.userPinnedSignal.findMany({where:{userId:profileUserId}, orderBy:{sortOrder:'asc'}, take:6, select:{signal:{select:{id,symbol,direction,tier,status,entry}}}})`
- [ ] Return `null` nếu `pins.length === 0`
- [ ] Render `<section>` với heading từ `t('profile.pinnedSignals')`
- [ ] Mỗi item: `<Link href="/signals/{id}">` + symbol + direction badge + tier badge
- [ ] Ẩn `entry` nếu: `signal.tier === 'VIP'` AND `viewerUserId !== profileUserId` AND `!isVipActive(viewerVipUntil)`
- [ ] Import `isVipActive` từ `@/lib/vip`

### Tiêu chí hoàn thành
- [ ] TypeScript không lỗi
- [ ] VIP signal ẩn entry đúng với viewer không VIP

---

## [T009] Tích hợp PinSignalButton vào signal detail page

**Phụ thuộc:** T006, T007
**Files cần đụng:** `src/app/[locale]/signals/[signalId]/page.tsx`
**Ước tính:** 1h

### Làm gì
- [ ] Thêm vào `Promise.all` (chỉ khi `userId` tồn tại):
  - [ ] `prisma.userPinnedSignal.findUnique({where:{userId_signalId:{userId,signalId}}})`
  - [ ] `prisma.userPinnedSignal.count({where:{userId}})`
- [ ] Tính `isPinned = !!existingPin` và `atLimit = pinCount >= MAX_PINS`
- [ ] Render `<PinSignalButton signalId={signal.id} signalSymbol={signal.symbol} isPinned={isPinned} loggedIn={!!userId} atLimit={atLimit}/>` trong card actions (bên cạnh reactions)
- [ ] Import `MAX_PINS` từ `@/lib/signals/pin-signal-limit`

### Tiêu chí hoàn thành
- [ ] Nút hiển thị đúng với user đã login và ẩn với guest
- [ ] `npm test` pass

---

## [T010] Tích hợp PinnedSignalsSection vào public profile page

**Phụ thuộc:** T006, T008
**Files cần đụng:** `src/app/[locale]/u/[userId]/page.tsx`
**Ước tính:** 1h

### Làm gì
- [ ] Thêm query viewer's VIP vào `Promise.all` hiện có (chỉ khi `session?.user?.id`): `prisma.user.findUnique({where:{id:session.user.id}, select:{vipUntil:true}})`
- [ ] Render `<PinnedSignalsSection profileUserId={userId} viewerVipUntil={viewerDbUser?.vipUntil} viewerUserId={session?.user?.id}/>` ngay sau `<TraderPerformanceCard>`, trước phần follower grid

### Tiêu chí hoàn thành
- [ ] Section hiển thị đúng thứ tự trên trang profile
- [ ] `npm test` pass

---

## Checklist cuối (trước khi merge)

- [ ] `npm run lint` — không lỗi ESLint
- [ ] `npx tsc --noEmit` — không lỗi TypeScript
- [ ] `npm test` — tất cả tests pass
- [ ] `npm run build` — build thành công
- [ ] Test thủ công: pin 6 signal → cố pin thêm → thấy error hint
- [ ] Test thủ công: VIP signal trong pin list → viewer không VIP thấy entry bị ẩn
- [ ] Test thủ công: xóa signal đã pin → tự biến mất (cascade)
- [ ] Test thủ công: kiểm tra trên `/vi/` và `/en/`

---

## Ghi chú kỹ thuật

| Rủi ro | Giải pháp |
|---|---|
| Race condition pin đồng thời | Catch `P2002` → return `{ok:true, pinned:true}` |
| Signal bị admin xóa | `onDelete: Cascade` trên FK `signalId` |
| VIP signal trong pin list công khai | Ẩn entry, giữ symbol/direction — dùng `isVipActive()` |
| Prisma client chưa có model mới | Chạy `db:generate` **trước** khi viết code |
| `sortOrder` sau re-pin | `sortOrder = count` → signal về cuối (chấp nhận v1) |
