# Mistake Tagging + Cost Ranking — Design

**Date:** 2026-09-01
**Area:** Journal → form + tab Thống kê
**Status:** approved, implementing

## Vấn đề

Discipline Scorecard chấm vi phạm quy tắc **tự động** từ data. Không có kênh để
trader **tự khai** lỗi định tính ("dời SL", "vào sớm", "over-size") và không biết
lỗi nào tốn tiền nhất để ưu tiên sửa.

## Giải pháp

- `TradeJournal.mistakes String[]` — nhãn lỗi tự khai, catalog cố định 12 tag.
- Nhóm checkbox trong form thêm/sửa lệnh.
- Card "Lỗi mắc phải — xếp hạng theo chi phí" trên tab Thống kê, ngay sau
  Discipline Scorecard: xếp tag theo tổng P/L (âm nhất trước) + so win-rate
  lệnh có lỗi vs sạch lỗi.

Không AI, request-time.

## Schema

`mistakes String[] @default([])` trên `TradeJournal`. Migration tay
`20260901100000_journal_mistakes`: `ALTER TABLE "TradeJournal" ADD COLUMN
"mistakes" TEXT[] NOT NULL DEFAULT '{}';` (`prisma migrate dev` hỏng shadow DB).

## Catalog — `src/lib/journal/mistakes.ts`

`TRADE_MISTAKES`: `NO_STOP`, `MOVED_STOP`, `EARLY_ENTRY`, `CHASED`, `OVERSIZED`,
`NO_PLAN`, `CUT_WINNER_EARLY`, `HELD_LOSER`, `AGAINST_TREND`, `REVENGE`, `NEWS`,
`OVERTRADING`.

`parseMistakes(value): MistakeTag[]` — nhận array hoặc chuỗi phẩy, lọc tag hợp lệ,
dedupe, giữ thứ tự catalog (cap = độ dài catalog).

`useMistakeLabels()` trong `use-setup-labels.ts` → keys `journal.mistake<Tag>`.

## Form

`MistakeCheckboxes` (`src/components/journal/mistake-checkboxes.tsx`, client):
`<details>` "Lỗi mắc phải (tùy chọn)" chứa grid checkbox `name="mistakes"`,
`open` khi `defaultSelected` không rỗng. Đặt trước ô Notes trong
`JournalFormCard` (không defaultSelected) và `EditForm` (`defaultSelected={trade.mistakes}`).

Action `createTrade` / `updateTrade`: thêm
`mistakes: parseMistakes(formData.getAll("mistakes"))` — parse ngoài zod như
`setup` / `emotion`.

## Module xếp hạng — `src/lib/journal/mistake-stats.ts`

`computeMistakeStats(trades): MistakeStats` (chỉ lệnh đã đóng)

```ts
type MistakeStat = {
  tag; count; wins; losses;
  winRate: number | null;   // null khi < 2 W/L
  totalPnl: number;         // sum pnl các lệnh tagged có pnl
  avgPnl: number | null;
};
type MistakeStats = {
  rows: MistakeStat[];       // tag xuất hiện ≥1, sort totalPnl asc, tie-break count desc
  taggedTrades; untaggedClosed;
  withMistakeWinRate: number | null;
  withoutMistakeWinRate: number | null;
};
```

- Mỗi lệnh đếm 1 lần / tag (dedupe tag trùng trong 1 lệnh).
- Lệnh không có pnl vẫn tính vào `count` nhưng không vào `totalPnl`.

## UI — `MistakeCostCard` trong `journal-advanced-stats.tsx`

Render khi `taggedTrades >= 3`. Sau `DisciplineScorecardCard`.

- Insight amber (khi `rows[0].totalPnl < 0`): "Lỗi đắt nhất: {label} — {count}
  lệnh, tổng {total} (TB {avg}/lệnh)."
- Danh sách: nhãn | số lệnh | win-rate | bar |totalPnl|/max + số tiền (đỏ/xanh).
- Dòng so sánh (khi cả 2 rate non-null): "Lệnh có ≥1 lỗi thắng X% so với Y% khi
  sạch lỗi."

Prop `mistakeStats` từ `page.tsx` (`computeMistakeStats(serialized)`, không query mới).

## Table + CSV

- `journal-table.tsx`: `Trade.mistakes: string[]`; dòng phụ dưới symbol thêm
  "⚠ {nhãn lỗi}" màu amber (truncate); cột `Mistakes` (join `;`) vào CSV.
- **Không** thêm filter theo lỗi ở v1.

## Test

- `mistakes.test.ts` — parseMistakes (6)
- `mistake-stats.test.ts` — sort theo chi phí, tie-break, dedupe/lệnh, winRate
  null, so sánh with/without, rỗng, pnl-less (9)

## i18n

`journal.mistake*` + `journal.mistakesField*` vi + en.

## Ngoài phạm vi

- Feed `mistakes` vào instant AI trade review.
- Filter bảng lịch sử theo lỗi.
- Tự động suy ra mistake tag từ data.
