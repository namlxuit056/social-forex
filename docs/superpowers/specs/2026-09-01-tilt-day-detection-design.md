# Tilt-Day Detection + Post-Mortem — Design

**Date:** 2026-09-01
**Area:** Journal → tab Thống kê
**Status:** approved, implementing

## Vấn đề

Revenge cooldown + daily-limit guard chặn tại thời điểm giao dịch. Không có
công cụ **hồi cứu** chỉ ra "những ngày mình xổ đồ" và cái giá phải trả.

## Giải pháp

Module thuần rule-based gom lệnh đã đóng theo ngày UTC, chấm 6 tín hiệu, đánh
dấu ngày ≥ 2 tín hiệu là "ngày tilt". Card trên tab Thống kê liệt kê + mổ xẻ.
Không AI, không real-time, request-time.

## Module — `src/lib/journal/tilt-days.ts`

`computeTiltDays(trades: TiltTrade[], plans?: TiltPlanDay[]): TiltDaysResult`

### 6 tín hiệu / ngày

| tín hiệu | kích hoạt |
|----------|-----------|
| `lossStreak` | chuỗi LOSS liên tiếp trong ngày ≥ `LOSS_STREAK_MIN` (3), theo thứ tự `closedAt ?? openedAt` |
| `sizeEscalation` | ∃ lệnh có `lotSize` > lệnh liền trước **và lệnh trước LOSS** (cả 2 có lotSize) |
| `overtrading` | số lệnh ≥ `OVERTRADE_ABS` (6) **hoặc** (có plan `maxTrades` và số lệnh ≥ maxTrades + `OVERTRADE_PLAN_MARGIN` (2)) |
| `guardOverride` | ∃ lệnh `overrodeDailyLimit` hoặc `overrodeLossStreakGuard` |
| `revenge` | ∃ lệnh `emotion === "REVENGE"` hoặc mistake tag ∈ {REVENGE, OVERTRADING, CHASED} |
| `deepLoss` | tổng realized R trong ngày ≤ `DEEP_LOSS_R` (−3) |

Ngày tilt = `signals.length >= TILT_SIGNAL_MIN` (2). Sort: signals desc → netPnl asc.

### Output

```ts
type TiltDay = {
  day: string;           // YYYY-MM-DD UTC
  tradeCount; netPnl; netR: number | null; lossStreak;
  signals: TiltSignal[];
  trades: { symbol; result; pnl; lotSize }[];
};
type TiltDaysResult = {
  tiltDays: TiltDay[];   // cap không có ở module, card cắt 10
  tradingDays: number;   // số ngày có ≥1 lệnh đóng
  tiltNetPnl; normalNetPnl: number;
  tiltWinRate; normalWinRate: number | null;  // null khi <2 W/L
};
```

## UI — `TiltDaysCard` trong `journal-advanced-stats.tsx`

Sau `MistakeCostCard`. Render khi `tiltDays.length >= 1 && tradingDays >= 5`.

- Note: "{count} ngày tilt trên {total} ngày giao dịch".
- Payoff amber (khi cả 2 winRate non-null): "Các ngày tilt tổng {tiltPnl}
  (thắng {tiltRate}%) so với {normalPnl} ({normalRate}%) các ngày còn lại."
- Danh sách ≤ 10 `<details>`: summary = ngày | số lệnh | netPnl | chip tín hiệu
  (amber); body = bảng mini lệnh trong ngày (symbol · result · lot · pnl).

Prop `tiltDays` từ `page.tsx`: `computeTiltDays(serialized, planLimitsRaw.map(...))`
— không query mới.

## i18n

`journal.tilt*` (title/note/payoff + 6 nhãn tín hiệu) vi + en.

## Test — `tilt-days.test.ts` (8)

empty/calm, ngưỡng ≥2 tín hiệu, lossStreak+deepLoss, sizeEscalation,
overtrading (abs + theo plan), revenge (emotion|mistake), sort, split P/L+winRate.

## Ngoài phạm vi

- Cảnh báo real-time (đã có 2 guard).
- Feed vào AI daily/weekly review.
- Toggle ranh giới ngày VN/UTC (dùng UTC như phần lớn journal).
