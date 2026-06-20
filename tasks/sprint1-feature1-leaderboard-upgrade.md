# Task: Nâng cấp Leaderboard

**Sprint:** 1 | **Feature:** Verified Performance Card  
**File chính:** `src/app/[locale]/leaderboard/page.tsx`  
**Trạng thái:** TODO

---

## Context

Leaderboard hiện tại chỉ hiển thị Wins / Losses / Win Rate tính từ bảng `Signal`.  
Không có filter timeframe, không có Profit Factor, không biết trader nào có MT5 verified.

`TraderPerformanceCard` và `PublicPerformanceChart` đã tính Profit Factor + Max Drawdown từ `TradeJournal` — nhưng Leaderboard chưa dùng dữ liệu đó.

---

## Việc cần làm

### 1. Thêm timeframe filter (30d / 90d / all)

- Đọc `searchParams.timeframe` (`"30d" | "90d" | "all"`, default `"all"`)
- Tính `since = new Date(Date.now() - days * 86400_000)` rồi thêm `where: { closedAt: { gte: since } }` vào query `Signal`
- Render 3 nút filter trên UI — link sang `?timeframe=30d` v.v.

### 2. Thêm cột Profit Factor

Profit Factor = tổng PnL thắng / |tổng PnL thua|, tính từ `TradeJournal` (có PnL thực).  
Nếu trader không có `TradeJournal` → hiển thị `—`.

Query cần thêm:
```ts
prisma.tradeJournal.findMany({
  where: {
    userId: { in: [...userIds] },
    result: { in: ["WIN", "LOSS"] },
    ...(since ? { closedAt: { gte: since } } : {}),
  },
  select: { userId: true, result: true, pnl: true },
})
```

Tính per-user rồi merge vào `rows`.

### 3. Sort mặc định theo Profit Factor

Thứ tự ưu tiên: Profit Factor DESC → Win Rate DESC → Total DESC  
Traders không có Profit Factor (thiếu journal) xếp sau.

### 4. MT5 Verified badge

Query `Mt5Connection` cho các `userId` trong bảng:
```ts
prisma.mt5Connection.findMany({
  where: { userId: { in: [...userIds] }, revokedAt: null },
  select: { userId: true },
})
```

Hiển thị icon `ShieldCheck` (emerald) cạnh tên trader nếu có kết nối MT5.

### 5. Min trades guard

Chỉ hiển thị traders có `total >= 3` (tránh 1 win = 100% win rate).

---

## Cấu trúc bảng sau khi xong

| # | Trader | W | L | Win Rate | Profit Factor | MT5 |
|---|---|---|---|---|---|---|
| 1 | Nam | 12 | 3 | 80% | 2.4 | ✓ |
| 2 | Trader B | 8 | 4 | 66.7% | 1.8 | — |

---

## Notes

- Không cần migration DB
- Sort server-side (không cần client state)
- `searchParams` dùng Next.js App Router pattern: `params: Promise<{ locale: string }>`, `searchParams?: Promise<{ timeframe?: string }>`
