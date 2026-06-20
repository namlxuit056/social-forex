# Task: Mở rộng Performance Stats Library

**Sprint:** 1 | **Feature:** Verified Performance Card  
**File chính:** `src/lib/signals/public-performance-stats.ts`  
**File phụ:** `src/lib/signals/public-performance-math.ts`  
**Trạng thái:** TODO

---

## Context

`public-performance-stats.ts` hiện chỉ có `getClosedSignalStatsForAuthor()` trả về `{ wins, losses, total }`.

`PublicPerformanceChart` đã tính Profit Factor + Max Drawdown + Streak **ở client** từ `TradeJournal`.  
Nhưng `TraderPerformanceCard` cần thêm **Avg R:R** và **Consistency Score** từ `Signal` records.

---

## Việc cần làm

### 1. Thêm `getSignalPerformanceStats(authorId, since?)` vào `public-performance-stats.ts`

Trả về:
```ts
type SignalPerformanceStats = {
  wins: number;
  losses: number;
  total: number;
  avgRR: number | null;       // Avg Risk:Reward ratio từ entry/SL/TP
  consistencyScore: number;   // 0–100, % ngày active trong 30 ngày gần nhất
};
```

**Tính Avg R:R:**
```ts
// Chỉ tính signal có đủ entry, stopLoss, takeProfit
const rr = (takeProfit - entry) / (entry - stopLoss)  // LONG
         // hoặc (entry - takeProfit) / (stopLoss - entry)  // SHORT
// direction: "BUY"/"LONG" → first formula; "SELL"/"SHORT" → second
// Avg R:R = mean của tất cả R:R > 0
```

**Tính Consistency Score:**
```ts
// Số ngày khác nhau có ít nhất 1 signal trong 30 ngày gần nhất
const since30d = new Date(Date.now() - 30 * 86400_000);
const signals30d = await prisma.signal.findMany({
  where: { authorId, createdAt: { gte: since30d } },
  select: { createdAt: true },
});
const activeDays = new Set(signals30d.map(s => s.createdAt.toISOString().slice(0, 10)));
const score = Math.round((activeDays.size / 30) * 100);
```

### 2. Thêm helper `calcRR(direction, entry, sl, tp)` vào `public-performance-math.ts`

```ts
export function calcRR(
  direction: string,
  entry: number,
  stopLoss: number,
  takeProfit: number,
): number | null {
  const isBuy = direction.toUpperCase().includes("BUY") || direction.toUpperCase() === "LONG";
  const risk = isBuy ? entry - stopLoss : stopLoss - entry;
  const reward = isBuy ? takeProfit - entry : entry - takeProfit;
  if (risk <= 0 || reward <= 0) return null;
  return reward / risk;
}
```

---

## Notes

- Không cần migration
- `getClosedSignalStatsForAuthor()` giữ nguyên để không break `TraderPerformanceCard` cũ
- `getSignalPerformanceStats()` gọi thêm 1 query signals với `select: { direction, entry, stopLoss, takeProfit }`
- Test file: `src/lib/signals/public-performance-math.test.ts` — thêm test case cho `calcRR`
