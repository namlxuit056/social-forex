# Task Board: Referral Program

> **Story:** Thu hút user mới qua referral link — cả referrer và referee đều được VIP
> **Tổng estimate:** ~8 giờ
> **Ngày tạo:** 2026-06-21

---

## Definition of Done

- [ ] Mỗi user có referral code duy nhất (8 ký tự)
- [ ] Referral link dạng `/?ref=CODE` trên trang đăng ký
- [ ] Khi referee đăng ký + verify email → referrer được 7 ngày VIP, referee được 3 ngày VIP
- [ ] Dashboard hiển thị referral link + stats (số người đã invite, VIP earned)
- [ ] Profile page hiển thị referral link
- [ ] i18n đầy đủ `vi` và `en`
- [ ] Unit test cho referral code generation

---

## [T001] Schema: thêm referral fields vào User + ReferralEvent model

**Files:** `prisma/schema.prisma`

### Làm gì
- [ ] Thêm `referralCode String? @unique` vào User
- [ ] Thêm `referredById String?` + relation `referredBy User?` vào User
- [ ] Tạo model `ReferralEvent`:
  - `id`, `referrerId`, `refereeId`, `rewardDays` (Int), `createdAt`
  - FK refs, `@@unique([referrerId, refereeId])`
- [ ] `prisma db push` + `db:generate`

---

## [T002] Referral code generation utility + tests

**Files:** `src/lib/referral.ts`, `src/lib/referral.test.ts`

### Làm gì
- [ ] `generateReferralCode()` — random 8 ký tự uppercase alphanumeric
- [ ] `getReferralLink(code)` — trả về URL với `?ref=CODE`
- [ ] Unit tests: length = 8, unique per call, valid chars

---

## [T003] Update registration flow — accept referral code

**Files:** `src/app/api/auth/register/route.ts`, `src/components/auth/register-form.tsx`, `src/app/[locale]/auth/register/page.tsx`

### Làm gì
- [ ] Register form: thêm hidden input `ref` từ query params
- [ ] Register API: accept `ref` field, validate, save `referredById`
- [ ] Generate `referralCode` cho user mới trong transaction

---

## [T004] Reward logic on email verification

**Files:** `src/app/api/auth/verify-email/route.ts`

### Làm gì
- [ ] Sau khi verify email thành công, check user có `referredById`
- [ ] Nếu có + chưa có ReferralEvent → grant VIP cho cả 2
- [ ] Referrer: 7 ngày VIP, Referee: 3 ngày VIP
- [ ] Tạo ReferralEvent record

---

## [T005] Dashboard referral widget

**Files:** `src/components/dashboard/referral-widget.tsx`, `src/app/[locale]/dashboard/page.tsx`

### Làm gì
- [ ] Widget hiển thị: referral link + copy button + stats
- [ ] Stats: số người đã invite, total VIP days earned
- [ ] Render trên dashboard sau DailyActivityWidget

---

## [T006] i18n keys

**Files:** `messages/en.json`, `messages/vi.json`

### Làm gì
- [ ] Namespace `referral`: title, description, linkLabel, copyLink, copied, shareVia, statsInvited, statsVipEarned, rewardHint, noReferrals

---

## [T007] Profile referral section

**Files:** `src/app/[locale]/u/[userId]/page.tsx`

### Làm gì
- [ ] Hiển thị referral link trên profile (chỉ chủ profile)
- [ ] Copy button

---

## Checklist cuối

- [ ] `npm run lint` pass
- [ ] `npx tsc --noEmit` pass
- [ ] `npm test` pass
- [ ] `npm run build` pass
- [ ] Test: register với referral code → cả 2 được VIP
