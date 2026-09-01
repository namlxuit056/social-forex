# Discipline Scorecard + Leverage Ranking — Design

**Date:** 2026-09-01
**Area:** Journal → tab Thống kê
**Status:** approved, implementing

## Vấn đề

Journal đã có 6 module đo lường kỷ luật rời rạc — `checklist-compliance`,
`emotion-diary-correlation`, `playbook-adherence`, `plan-compliance`,
`guard-overrides`, `risk-discipline` — mỗi cái render 1 card riêng và tự nói
"nhóm này thắng X%". Trader không biết **đòn bẩy nào quan trọng nhất** để tập
trung cải thiện.

## Giải pháp

1 card tổng hợp "Bảng điểm kỷ luật" đặt ở đầu tab Thống kê (ngay sau
`JournalGoalTracker`). 6 card cũ giữ nguyên bên dưới làm drill-down.

- **Điểm tổng**: trung bình điểm kỷ luật mỗi lệnh (0–100).
- **Xếp hạng đòn bẩy**: mỗi quy tắc so win-rate nhóm tuân thủ vs vi phạm,
  xếp theo độ chênh, gọi tên đòn bẩy lớn nhất.

Deterministic, có test, **không schema mới, không cron, request-time**.

## Module: `src/lib/journal/discipline-scorecard.ts`

`computeDisciplineScorecard(input): DisciplineScorecard`

### Input

```ts
type ScorecardInput = {
  trades: ScorecardTrade[];   // đã serialize sẵn trong page.tsx
  plans: ScorecardPlanDay[];  // DailyTradingPlan: planDate + 5 checked*
  moods: ScorecardMoodDay[];  // MoodCheckin: day + mood
  diary: ScorecardDiaryDay[]; // EmotionDiaryEntry: date + note
  bestSetup: string | null;   // findBestRow(...).key — setup win-rate cao nhất
};
```

### Bộ quy tắc (đánh giá trên lệnh đã đóng: WIN/LOSS/BREAKEVEN)

| id | Tuân thủ khi | Áp dụng khi |
|----|--------------|-------------|
| `hasStopLoss` | `stopLoss != null` | mọi lệnh đóng |
| `riskWithinLimit` | `realizedR >= -1.15` (`VIOLATION_R_THRESHOLD`) | tính được R |
| `withinDailyLimit` | `!overrodeDailyLimit` | mọi lệnh đóng |
| `noRevengeOverride` | `!overrodeLossStreakGuard` | mọi lệnh đóng |
| `checklistComplete` | plan ngày `openedAt` (UTC) đủ 5/5 mục | có plan ngày đó |
| `positiveMood` | KHÔNG (mood ∈ {tired,stressed} HOẶC diary mood = negative) | có mood hoặc diary ngày đó |
| `onPlaybook` | `setup === bestSetup` | có `bestSetup` & lệnh có setup |

### Chấm điểm

- Điểm mỗi lệnh = (số quy tắc tuân thủ) / (số quy tắc áp dụng), 0..1.
- `overallScore` = trung bình điểm các lệnh × 100, làm tròn. `null` khi
  `sampleSize === 0`.
- `sampleSize` = số lệnh đã đóng.

### Xếp hạng đòn bẩy

Mỗi quy tắc: chia lệnh thành nhóm tuân thủ / vi phạm.

- `followedWinRate` / `violatedWinRate` = wins/(wins+losses) mỗi phía, 1 chữ số
  thập phân; `null` khi phía đó < `MIN_SIDE` (5) lệnh W/L.
- `winRateGap` = followed − violated (chỉ khi cả 2 phía non-null).
- `avgRGap`, `avgPnlGap` tương tự (mean realized R / mean pnl mỗi phía).
- `ranked` = cả 2 phía có ≥ `MIN_SIDE` lệnh W/L.
- `topLever` = quy tắc `ranked` có `winRateGap > 0` lớn nhất; tie-break
  `avgPnlGap` → `avgRGap` → thứ tự khai báo. `null` nếu không có.

### Output

```ts
type DisciplineScorecard = {
  overallScore: number | null;
  sampleSize: number;
  rules: RuleResult[];  // theo thứ tự khai báo
  topLever: RuleId | null;
};
```

## UI — `DisciplineScorecardCard` trong `journal-advanced-stats.tsx`

Render khi `sampleSize >= 5 && overallScore !== null`. Đặt ngay sau
`{goalTracker}` trong nhánh return chính.

- Header: `scorecardTitle` + `scorecardNote` (kèm số lệnh).
- Điểm lớn `NN/100`, màu: ≥80 emerald / ≥60 amber / <60 red.
- Câu insight `scorecardTopLever` (amber, hoặc emerald khi score ≥ 80) với tên
  quy tắc + win-rate 2 phía + gap. Nếu `topLever === null` → `scorecardNoLever`
  màu muted.
- Danh sách quy tắc: mỗi dòng = nhãn | mini-bar % tuân thủ | `61% ✓ / 32% ✗` |
  badge gap. Dòng chưa `ranked` → `scorecardNotEnough` mờ.
- Style: `Card` + mini-bar `<div>` như phần còn lại của file. Không thêm dep.

## Wiring — `src/app/[locale]/journal/page.tsx`

- Thêm query vào `Promise.all` khi `activeTab === "stats"`:
  `prisma.moodCheckin.findMany({ where: { userId }, select: { day: true, mood: true }, take: 365 })`.
- `emotionEntries` đã fetch cho tab stats → tái dùng làm `diary`.
- `bestSetup = bestSetupRow?.key ?? null`.
- `computeDisciplineScorecard(...)` → prop mới `scorecard` cho `JournalAdvancedStats`.

## i18n

Keys `journal.scorecard*` trong `messages/vi.json` + `messages/en.json` (sync).

## Test — `src/lib/journal/discipline-scorecard.test.ts` (~8)

- overallScore = trung bình pass-rate đúng
- per-rule followed/violated đếm đúng, applicable loại lệnh không đủ điều kiện
- winRateGap chỉ tính khi cả 2 phía ≥ MIN_SIDE
- topLever chọn đúng quy tắc gap lớn nhất + tie-break
- ngưỡng MIN_SIDE loại quy tắc thiếu mẫu khỏi ranked
- mảng rỗng / toàn PENDING → overallScore null, sampleSize 0, topLever null
- positiveMood: mood tiêu cực và diary negative đều đánh "violated"
- checklistComplete: chỉ áp dụng ngày có plan

## Ngoài phạm vi

- Streak ngày kỷ luật liên tiếp / biểu đồ trend (feature riêng, chưa duyệt).
- Thay thế / xoá 6 card cũ.
- Chấm điểm theo ngày thay vì theo lệnh.
