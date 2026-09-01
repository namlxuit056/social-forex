# Good Trading Days (by process) — Design

**Date:** 2026-09-01
**Area:** Journal → tab Thống kê
**Status:** approved, implementing

## Vấn đề

Tilt-day detection chỉ soi ngày xấu. Không có bản đối xứng tôn vinh ngày thực
thi **sạch** — làm trader chỉ thấy phần tiêu cực.

## Giải pháp

Module thuần chấm **tín hiệu tích cực** mỗi ngày (theo quy trình, không theo
P/L). Card trên tab Thống kê ngay trước `TiltDaysCard`. Reuse toàn bộ data đã
fetch cho tab stats — không schema, không query mới, request-time.

## Module — `src/lib/journal/green-days.ts`

`computeGreenDays(trades, plans?, moods?, bestSetup?): GreenDaysResult`

### 7 tín hiệu / ngày (lệnh đã đóng, gom theo ngày UTC)

| tín hiệu | đạt khi |
|----------|---------|
| `checklistDone` | plan ngày đó đủ 5/5 `checked*` |
| `withinLimit` | số lệnh ≤ `plan.maxTrades` (fallback `DISCIPLINED_MAX_TRADES` = 4 khi không có plan) |
| `allHaveStop` | mọi lệnh có `stopLoss` |
| `noMistakes` | không lệnh nào có mistake tag |
| `steadyMood` | MoodCheckin ∈ {good, ok} **và** không lệnh nào emotion ∈ {REVENGE, FOMO} |
| `hitTarget` | tổng realized R trong ngày ≥ `GREEN_TARGET_R` (2) |
| `onPlaybook` | có `bestSetup`, ≥1 lệnh có setup, và mọi lệnh có setup đều = `bestSetup` |

**Ngày tốt** = `signals.length >= GREEN_SIGNAL_MIN` (3) **và** `noMistakes` **và**
không lệnh nào phá guard (2 cổng cứng). Sort: signals desc → netPnl desc.

### Output

```ts
type GreenDay = { day; tradeCount; netPnl; netR: number|null; signals: GreenSignal[]; trades[] };
type GreenDaysResult = {
  greenDays: GreenDay[];
  tradingDays: number;
  greenNetPnl; otherNetPnl: number;
  greenWinRate; otherWinRate: number | null;   // null khi <2 W/L
  common: {                                     // "chân dung" ngày tốt
    symbol; setup; session: "asia"|"london"|"newyork" | null;
    avgTradeCount: number | null; mood: string | null;
  };
};
```

`common.*` = mode trên toàn bộ lệnh (hoặc ngày) của các ngày tốt.
`session` dùng `sessionOfUtcHour` từ `edge-stats.ts`.

Ngưỡng const: `GREEN_SIGNAL_MIN=3`, `GREEN_TARGET_R=2`, `DISCIPLINED_MAX_TRADES=4`.

## UI — `GreenDaysCard` trong `journal-advanced-stats.tsx`

Trước `TiltDaysCard`. Render khi `greenDays.length >= 1 && tradingDays >= 5`.

- Note đếm ngày.
- Dòng "chân dung" emerald: "Ngày tốt của bạn thường: {symbol} · {setup} ·
  {session} · ~{n} lệnh · {mood}." (bỏ phần null).
- Dòng payoff: green days P/L + win-rate vs phần còn lại.
- Danh sách ≤ 10 `<details>` — chip tín hiệu emerald + bảng mini lệnh (cùng
  layout `TiltDaysCard`).

Prop `greenDays` từ `page.tsx`:
`computeGreenDays(serialized, planLimitsRaw, moodCheckinsRaw, bestSetupRow?.key)`.

## i18n

`journal.green*` (title/note/portrait/payoff + 7 nhãn tín hiệu) vi + en.
Nhãn mood tái dùng `journal.moodGood/moodOk/...`, session `journal.sessionAsia/...`.

## Test — `green-days.test.ts` (8)

empty, ngày sạch 3 tín hiệu, mistake tag loại ngày, guard override loại ngày,
ngưỡng ≥3, steadyMood (good + calm vs REVENGE), hitTarget+onPlaybook,
split P/L + sort + portrait mode.

## Ngoài phạm vi

- Gộp module với `tilt-days.ts`.
- Feed vào AI daily/weekly review.
- Nhánh "theo kết quả" / "may mắn" (user chọn thuần theo quy trình).
