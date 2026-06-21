# Task Board: Streak + Daily XP Gamification

> **Story:** Thêm hệ thống XP points và daily activity widget để tăng retention
> **Tổng estimate:** ~8.5 giờ
> **Ngày tạo:** 2026-06-21

---

## Context

Streak cơ bản **đã có sẵn**:
- `streakJournal`, `streakPlan`, `streakSignal` + `lastJournalDate/Plan/SignalDate` trên `User` model (`prisma/schema.prisma:96-101`)
- `updateStreak()` utility (`src/lib/streak.ts:16`)
- `StreakBadge` component (`src/components/signals/streak-badge.tsx`)
- Streak reminder cron (`src/app/api/streak-reminder/route.ts`)
- Triggered in: journal action, signal action, plan action

**Chưa có:** XP/points, daily activity summary trên dashboard, level system.

---

## Definition of Done

- [ ] User có field `xp` (Int, default 0) trên model User
- [ ] Mỗi hành động (journal, plan, signal, post forum) cộng XP
- [ ] Dashboard hiển thị "Daily Activity" widget: completed_today + streak hiện tại + XP earned today
- [ ] Leaderboard hiển thị XP column, sort được theo XP
- [ ] Streak badge hiển thị trên signal card trong feed
- [ ] XP breakdown chi tiết hiển thị trên profile page
- [ ] i18n đầy đủ `vi` và `en`
- [ ] Unit test cho XP calculation logic

---

## Dependency Graph

```
T001 ──→ T002 ──→ T003 ──→ T004
                         ↘        ↘
                          T005      T006
                         ↗        ↗
T001 ──→ T007 ──→ T008 ──→ T009
```

**Song song được:** T004 & T005 (sau T003) | T008 & T009 (sau T007)

---

## [T001] Thêm field `xp` vào User model + migration

**Phụ thuộc:** (none)
**Files cần đụng:** `prisma/schema.prisma`
**Ước tính:** 0.5h

### Làm gì
- [ ] Thêm `xp Int @default(0)` vào model `User`
- [ ] Chạy `npm run db:migrate` — đặt tên migration `add_xp_to_user`
- [ ] Chạy `npm run db:generate`

### Tiêu chí hoàn thành
- [ ] `npx prisma validate` pass
- [ ] TypeScript không lỗi với field mới

---

## [T002] Tạo XP system utility + tests

**Phụ thuộc:** T001
**Files cần đụng:** `src/lib/xp.ts`, `src/lib/xp.test.ts`
**Ước tính:** 1h

### Làm gì
- [ ] Tạo `src/lib/xp.ts`:
  ```ts
  export const XP_VALUES = {
    journalCreate: 10,
    planComplete: 15,
    signalPost: 20,
    signalWin: 30,
    forumPost: 5,
    streakBonus7: 50,   // bonus khi streak >= 7 ngày
    streakBonus30: 200,  // bonus khi streak >= 30 ngày
  } as const;

  export type XpAction = keyof typeof XP_VALUES;

  export function calculateXp(action: XpAction, currentStreak?: number): number {
    let xp = XP_VALUES[action];
    if (currentStreak && currentStreak >= 30) xp += XP_VALUES.streakBonus30;
    else if (currentStreak && currentStreak >= 7) xp += XP_VALUES.streakBonus7;
    return xp;
  }
  ```
- [ ] Tạo `src/lib/xp.test.ts`:
  - [ ] `calculateXp('journalCreate')` → 10
  - [ ] `calculateXp('journalCreate', 5)` → 10 (streak < 7, no bonus)
  - [ ] `calculateXp('journalCreate', 7)` → 60 (10 + 50 bonus)
  - [ ] `calculateXp('journalCreate', 30)` → 210 (10 + 200 bonus)
  - [ ] `calculateXp('signalWin', 10)` → 80 (30 + 50 bonus)
- [ ] Tạo `addXp(userId, action, streak?)` async function:
  - [ ] Tính XP từ `calculateXp`
  - [ ] `prisma.user.update({ where: { id: userId }, data: { xp: { increment: xp } } })`
  - [ ] Return `{ xpEarned: xp, totalXp: newTotal }`

### Tiêu chí hoàn thành
- [ ] `npx vitest run src/lib/xp.test.ts` — 5/5 PASS

---

## [T003] Tích hợp XP vào các server actions hiện có

**Phụ thuộc:** T002
**Files cần đụng:** `src/actions/journal.ts`, `src/actions/signals.ts`, `src/actions/trading-plan.ts`
**Ước tính:** 1h

### Làm gì
- [ ] **`src/actions/journal.ts`**: Sau khi `updateStreak(session.user.id, "journal")`, gọi `addXp(session.user.id, "journalCreate")`
- [ ] **`src/actions/signals.ts`**: Sau khi signal được tạo, gọi `addXp(userId, "signalPost")`
- [ ] **`src/actions/trading-plan.ts`**: Khi plan hoàn thành (`completedAt` set), gọi `addXp(session.user.id, "planComplete")`
- [ ] Nếu có thêm action cho signal WIN (xem `Signal` status change), gọi `addXp(authorId, "signalWin")`

### Tiêu chí hoàn thành
- [ ] `npx tsc --noEmit` pass
- [ ] XP tăng đúng khi tạo journal/plan/signal (test thủ công)

---

## [T004] Tạo Daily Activity Widget component

**Phụ thuộc:** T003
**Files cần đụng:** `src/components/dashboard/daily-activity-widget.tsx`
**Ước tính:** 1.5h

### Làm gì
- [ ] `"use client"` component
- [ ] Props: `userId: string`
- [ ] Fetch data từ `/api/daily-activity` (tạo ở T005)
- [ ] Hiển thị:
  - [ ] Today's XP earned (so far)
  - [ ] 3 activity indicators: Journal ✓/✗, Plan ✓/✗, Signal ✓/✗
  - [ ] Current streaks: 🔥 journal X days, 📋 plan Y days, 📡 signal Z days
  - [ ] Total XP + level badge
- [ ] Auto-refresh mỗi 60s
- [ ] Responsive layout: grid 3 columns trên desktop, stack trên mobile

### Tiêu chí hoàn thành
- [ ] Component render không lỗi
- [ ] Hiển thị đúng 3 activities + streaks

---

## [T005] Tạo API endpoint daily-activity

**Phụ thuộc:** T003
**Files cần đụng:** `src/app/api/daily-activity/route.ts`
**Ước tính:** 1h

### Làm gì
- [ ] GET endpoint, cần auth (session)
- [ ] Query today's data:
  - [ ] Check `TradeJournal`: có entry nào `openedAt` >= today không
  - [ ] Check `DailyTradingPlan`: có plan `planDate` = today với `completedAt` != null không
  - [ ] Check `Signal`: có signal nào `createdAt` >= today không
  - [ ] Get user's `streakJournal`, `streakPlan`, `streakSignal`, `xp`
- [ ] Return `{ journal: bool, plan: bool, signal: bool, streaks: {journal, plan, signal}, xp, xpToday }`
- [ ] Cache: `Cache-Control: private, max-age=30` (30s)

### Tiêu chí hoàn thành
- [ ] Return đúng format với data test
- [ ] Auth check hoạt động

---

## [T006] Thêm i18n keys cho gamification

**Phụ thuộc:** T003
**Files cần đụng:** `messages/en.json`, `messages/vi.json`
**Ước tính:** 0.5h

### Làm gì
- [ ] Thêm namespace `gamification` vào cả 2 file:
  - [ ] `dailyActivity`: "Daily Activity" / "Hoạt động hôm nay"
  - [ ] `xpEarned`: "XP Earned" / "XP đã kiếm"
  - [ ] `journalDone`: "Journal completed" / "Đã ghi nhật ký"
  - [ ] `journalPending`: "Journal pending" / "Chưa ghi nhật ký"
  - [ ] `planDone`: "Plan completed" / "Đã lập kế hoạch"
  - [ ] `planPending`: "Plan pending" / "Chưa lập kế hoạch"
  - [ ] `signalDone`: "Signal posted" / "Đã đăng signal"
  - [ ] `signalPending`: "No signal yet" / "Chưa có signal"
  - [ ] `streakDays`: `{count} day streak` / `{count} ngày liên tiếp`
  - [ ] `totalXp`: "Total XP" / "Tổng XP"
  - [ ] `level`: "Level" / "Cấp độ"

### Tiêu chí hoàn thành
- [ ] Hai file sync cùng số key

---

## [T007] Tích hợp Daily Activity Widget vào Dashboard

**Phụ thuộc:** T001, T004
**Files cần đụng:** `src/app/[locale]/dashboard/page.tsx`
**Ước tính:** 1h

### Làm gì
- [ ] Import `DailyActivityWidget`
- [ ] Render widget ngay sau header section, trước Action Hub
- [ ] Chỉ render khi user đã login

### Tiêu chí hoàn thành
- [ ] Widget hiển thị trên dashboard
- [ ] Không lỗi TypeScript

---

## [T008] Thêm XP column vào Leaderboard

**Phụ thuộc:** T001
**Files cần đụng:** `src/app/[locale]/leaderboard/page.tsx`
**Ước tính:** 1.5h

### Làm gì
- [ ] Thêm `xp` vào User select query (đã có streakSignal)
- [ ] Thêm column "XP" vào bảng leaderboard
- [ ] Sort options mới: "Sort by XP" (default: Profit Factor)
- [ ] Hiển thị level badge cạnh XP number

### Tiêu chí hoàn thành
- [ ] XP column hiển thị đúng
- [ ] Sort theo XP hoạt động

---

## [T009] Hiển thị XP breakdown trên Profile page

**Phụ thuộc:** T001, T006
**Files cần đụng:** `src/app/[locale]/u/[userId]/page.tsx`
**Ước tính:** 1.5h

### Làm gì
- [ ] Thêm `xp` vào User select query (đã có streak fields)
- [ ] Tạo mini XP card trong hero section:
  - [ ] Level badge (tính từ XP: level = floor(xp / 100) + 1)
  - [ ] XP progress bar (XP hiện tại % 100)
  - [ ] Streak badges hiện tại (đã có StreakBadge)
- [ ] Render sau follower count, trước badges

### Tiêu chí hoàn thành
- [ ] XP card hiển thị đúng trên profile
- [ ] Level tính đúng

---

## Checklist cuối

- [ ] `npm run lint` — không lỗi ESLint
- [ ] `npx tsc --noEmit` — không lỗi TypeScript
- [ ] `npm test` — tất cả tests pass
- [ ] `npm run build` — build thành công
- [ ] Test thủ công: tạo journal → XP tăng trên dashboard
- [ ] Test thủ công: hoàn thành plan → XP + streak tăng
- [ ] Test thủ công: leaderboard hiển thị XP, sort được
- [ ] Test thủ công: profile hiển thị level + XP breakdown
- [ ] Test thủ công: trên `/vi/` và `/en/`

---

## Ghi chú kỹ thuật

| Rủi ro | Giải pháp |
|---|---|
| XP tăng sai do request duplicate | `addXp` gọi sau `updateStreak` — streak idempotent, XP có thể bị double nếu action re-trigger → cân nhắc dedupe bằng lastJournalDate check |
| Performance query daily-activity | Index `(userId, openedAt)` trên TradeJournal đã có; thêm index `(userId, planDate)` trên DailyTradingPlan nếu cần |
| Level system quá đơn giản (floor(xp/100)) | v1 chấp nhận — có thể nâng cấp thành tier-based sau |
| Dashboard widget re-render liên tục | Cache 30s ở API level + SWR interval 60s ở client |
