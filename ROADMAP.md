# Roadmap — Social Forex

Cập nhật: 2026-06-20

## Sprint 1 (tuần 1–2)

### 1. Verified Performance Card — Public Trader Portfolio

**Mục tiêu:** Trader thấy được độ tin cậy của signal provider trước khi follow.

**Việc cần làm:**
- Tính toán stats từ `Signal` + `TradeJournal` + `Mt5Snapshot`: Win Rate, Avg R:R, Profit Factor, Max Drawdown, Consistency Score
- Hiển thị Performance Card trên `/u/[userId]` — badge "Verified via MT5" nếu có `Mt5Connection`
- Nâng cấp `/leaderboard`: lọc theo timeframe (30d / 90d / all), sort theo Profit Factor
- Mini equity curve chart từ `Mt5Snapshot` trên profile

**Schema:** Không cần migration — tính từ data hiện có.

---

### 2. Copy Signal to Journal (1-click)

**Mục tiêu:** Giảm friction khi trader muốn theo signal — bước nhỏ trước Copy Trading thực sự.

**Việc cần làm:**
- Nút "Add to Journal" trên signal detail page → pre-fill `TradeJournal` form với symbol, direction, entry, SL, TP
- Link ngược: journal entry → original signal
- Hiển thị "X traders copied this signal" trên signal card
- Sau khi đóng: so sánh PnL thực vs PnL lý thuyết của signal

**Schema cần thêm:**
```prisma
model TradeJournal {
  copiedFromSignalId String?
  copiedFromSignal   Signal? @relation(fields: [copiedFromSignalId], references: [id], onDelete: SetNull)
}
```

---

## Sprint 2 (tuần 3–4)

### 3. Streak + Daily XP Gamification

**Mục tiêu:** Tăng retention — trader có lý do quay lại hằng ngày.

**Việc cần làm:**
- Journal Streak: số ngày liên tiếp ghi nhật ký
- Plan Streak: số ngày liên tiếp lập kế hoạch
- Signal Provider Streak: số ngày liên tiếp đăng signal
- Hiển thị streak badge trên profile, leaderboard, signal card
- Reminder notification nếu chưa complete journal/plan hôm nay

**Schema cần thêm:**
```prisma
model User {
  streakJournal    Int      @default(0)
  streakPlan       Int      @default(0)
  streakSignal     Int      @default(0)
  lastStreakDate   DateTime?
}
```

---

### 4. Risk Calculator Widget

**Mục tiêu:** Công cụ hữu ích giữ chân trader khi vào lệnh.

**Việc cần làm:**
- Widget tại `/journal` và signal detail page
- Input: Account balance (auto-fill từ MT5), Risk % per trade, Entry, Stop Loss
- Output: Lot size, $ risk, pip value
- Pre-fill từ signal entry/SL khi đang xem signal

**Schema:** Không cần — tính toán client-side.

---

## Sprint 3 (tuần 5–6)

### 5. Social Feed — Activity Stream

**Mục tiêu:** Twitter-like feed từ người đang follow → tăng engagement và thời gian trên platform.

**Việc cần làm:**
- Feed tại `/dashboard` hoặc `/feed`: aggregated events từ users đang follow
  - Signal mới, signal đóng WIN/LOSS, journal public, forum thread mới
- Infinite scroll, poll mỗi 30s
- Filter: Chỉ Signals / Chỉ Journal / Tất cả

**Schema:** Không cần migration — query từ `Signal`, `TradeJournal`, `ForumThread` join `UserFollow`.

---

### 6. Browser Push Notifications

**Mục tiêu:** Tăng mạnh engagement — hiện chỉ có Telegram + in-app.

**Việc cần làm:**
- Service Worker + Web Push API (VAPID keys)
- Subscribe flow tại `/notifications`
- Trigger push khi: signal mới từ người follow, signal WIN, streak warning
- Lưu subscription vào DB

**Schema cần thêm:**
```prisma
model UserPushSubscription {
  id        String   @id @default(cuid())
  userId    String
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## Backlog (trung hạn)

| Tính năng | Impact | Ghi chú |
|---|---|---|
| Copy Trading thực sự (MT5 EA auto-execute) | Rất cao | Cần viết EA MetaTrader, cân nhắc pháp lý |
| Referral Program | Cao | Tặng VIP ngày khi refer friend đăng ký |
| Webinar / Live Room | Cao | Cần streaming third-party (e.g. Daily.co) |
| Mobile PWA | Cao | Offline support, install to homescreen |
| Market Screener | Trung | Filter pairs theo điều kiện kỹ thuật |
