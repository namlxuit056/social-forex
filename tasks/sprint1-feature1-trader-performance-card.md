# Task: Nâng cấp TraderPerformanceCard

**Sprint:** 1 | **Feature:** Verified Performance Card  
**File chính:** `src/components/profile/trader-performance-card.tsx`  
**Phụ thuộc:** task `sprint1-feature1-performance-stats-lib` phải xong trước  
**Trạng thái:** TODO

---

## Context

`TraderPerformanceCard` hiện chỉ hiển thị Win Rate đơn giản.  
`ProfileTradingSummary` đã có MT5 badge nhưng nằm riêng — card này chưa có.

Cần nâng card thành một "trust signal" đầy đủ: Win Rate + Avg R:R + Consistency + MT5 badge.

---

## Layout mong muốn

```
┌─────────────────────────────────────────────────────┐
│ 📈 Hiệu suất giao dịch          [✓ Xác minh MT5]   │
│ Dựa trên tín hiệu đã đóng                           │
│─────────────────────────────────────────────────────│
│  Win Rate     │  Avg R:R     │  Consistency         │
│  73.5%        │  1 : 2.1     │  67%                 │
│  11W / 4L     │  15 signals  │  20/30 ngày          │
│─────────────────────────────────────────────────────│
│  [Xem tín hiệu của trader này →]                    │
└─────────────────────────────────────────────────────┘
```

---

## Việc cần làm

### 1. Cập nhật data fetching

Thay `getClosedSignalStatsForAuthor(userId)` bằng `getSignalPerformanceStats(userId)` (từ task lib).

Thêm query MT5:
```ts
const hasMt5 = await prisma.mt5Connection.findFirst({
  where: { userId, revokedAt: null },
  select: { id: true },
});
```

### 2. Render 3 stat blocks

| Stat | Value | Sub |
|---|---|---|
| Win Rate | `73.5%` | `11W / 4L / 15 total` |
| Avg R:R | `1 : 2.1` | `N signals` hoặc `—` nếu thiếu SL/TP |
| Consistency | `67%` | `20/30 ngày gần nhất` |

Fallback: nếu `total < TRADER_STATS_MIN_SAMPLE` → hiện "Chưa đủ dữ liệu (N/5 lệnh)".

### 3. MT5 Verified badge

```tsx
{hasMt5 && (
  <Badge className="gap-1 border-emerald-500/35 bg-emerald-500/10 text-emerald-400">
    <ShieldCheck className="size-3" />
    {t("mt5ReadOnlyBadge")}
  </Badge>
)}
```

Đặt ở góc trên phải `CardHeader`, dùng `flex justify-between`.

### 4. i18n keys cần thêm

Thêm vào `messages/vi.json` và `messages/en.json` (key prefix `profile.traderStats`):
- `avgRRLabel` — "Avg R:R"
- `avgRREmpty` — "Thiếu SL/TP" / "Missing SL/TP"
- `consistencyLabel` — "Hoạt động" / "Consistency"
- `consistencyValue` — "{active}/{total} ngày" / "{active}/{total} days"

---

## Notes

- `TraderPerformanceCard` là Server Component — data fetch server-side, không cần state
- `hasMt5` query nhỏ, thêm vào `Promise.all` cùng stats để không block
- Không xóa CTA button "Xem tín hiệu" — giữ nguyên
