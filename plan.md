# Plan: Cho phép user pin signal lên profile

## Definition of Done

- [ ] User đã đăng nhập có thể pin/unpin bất kỳ signal nào vào profile của mình (tối đa 6 signal).
- [ ] Nút Pin/Unpin hiển thị trên trang chi tiết signal (`/signals/[signalId]`) với người dùng đã đăng nhập.
- [ ] Trang public profile (`/u/[userId]`) hiển thị section "Tín hiệu đã ghim" với tối đa 6 signal theo thứ tự `sortOrder`.
- [ ] Signal tier VIP vẫn bị che với viewer không có VIP (không phải chủ profile).
- [ ] Không thể pin quá 6 signal — action trả về error rõ ràng.
- [ ] Race condition (2 request đồng thời) được xử lý an toàn bằng DB unique constraint + try/catch `P2002`.
- [ ] Signal bị xóa → tự động xóa khỏi danh sách pin (cascade).
- [ ] i18n đầy đủ cho cả `vi` và `en`.
- [ ] Unit test bao phủ logic giới hạn pin (`isAtPinLimit`).

---

## Components bị ảnh hưởng

### Tạo mới

| File | Mục đích |
|---|---|
| `prisma/migrations/20260516120000_user_pinned_signals/migration.sql` | Tạo bảng `UserPinnedSignal` trong PostgreSQL |
| `src/lib/signals/pin-signal-limit.ts` | Constant `MAX_PINS = 6` + pure function `isAtPinLimit(count)` |
| `src/lib/signals/pin-signal-limit.test.ts` | Unit test cho logic giới hạn pin |
| `src/components/signals/pin-signal-button.tsx` | Client component — nút Pin/Unpin trên signal detail |
| `src/components/profile/pinned-signals-section.tsx` | Server component — hiển thị danh sách signal đã pin trên public profile |

### Chỉnh sửa

| File | Thay đổi |
|---|---|
| `prisma/schema.prisma` | Thêm model `UserPinnedSignal`; thêm `pinnedSignals UserPinnedSignal[]` vào `User`; thêm `pinnedBy UserPinnedSignal[]` vào `Signal` |
| `src/actions/signal-social.ts` | Thêm server action `togglePinSignal` (auth → rateLimit → zod → DB → revalidatePath) |
| `messages/en.json` | Thêm `errors.pinLimitReached` và 6 key dưới namespace `profile` |
| `messages/vi.json` | Thêm `errors.pinLimitReached` và 6 key dưới namespace `profile` |
| `src/app/[locale]/signals/[signalId]/page.tsx` | Query pin state + pin count → render `PinSignalButton` |
| `src/app/[locale]/u/[userId]/page.tsx` | Query viewer's `vipUntil` → render `PinnedSignalsSection` |

---

## Rủi ro kỹ thuật

### 1. Race condition khi pin đồng thời
Hai request song song cùng pass `count < MAX_PINS` rồi cùng `INSERT` → Prisma throw `P2002`.  
**Xử lý:** Wrap `prisma.userPinnedSignal.create` trong `try/catch`, bắt `code === "P2002"` trả về `{ ok: true, pinned: true }`.

### 2. Signal bị xóa bởi admin/mod
`onDelete: Cascade` trên FK `signalId` đảm bảo `UserPinnedSignal` tự xóa khi signal bị xóa. Không cần cleanup thủ công.

### 3. VIP signal trong danh sách pin công khai
Viewer không VIP vẫn thấy signal VIP trong danh sách (symbol, direction) nhưng `entry/SL/TP` bị ẩn. Chủ profile luôn thấy đầy đủ.

### 4. Prisma client chưa có `userPinnedSignal`
Phải chạy `npm run db:generate` sau migration trước khi viết code dùng model mới.

### 5. `revalidatePath` và locale prefix
Route `/u/[userId]` dùng `force-dynamic` nên không có ISR cache cần bust. Nếu sau này thêm ISR, cần loop `routing.locales`.

### 6. `sortOrder` khi unpin rồi re-pin
Re-pin sẽ đặt signal ở cuối (`sortOrder = count`). Chấp nhận được cho v1.

---

## Thứ tự implement

```
T001 — Schema: thêm model UserPinnedSignal vào schema.prisma
  ↓
T002 — Migration: tạo file SQL + chạy prisma migrate dev
  ↓
T003 — Generate: npm run db:generate
  ↓
T004 — Utility: pin-signal-limit.ts + test     (song song T005)
T005 — i18n: thêm key vào en.json và vi.json
  ↓
T006 — Server Action: togglePinSignal
  ↓
T007 — Client Component: PinSignalButton       (song song T008)
T008 — Server Component: PinnedSignalsSection
  ↓
T009 — Signal Detail Page: tích hợp PinSignalButton
T010 — Public Profile Page: tích hợp PinnedSignalsSection
```
