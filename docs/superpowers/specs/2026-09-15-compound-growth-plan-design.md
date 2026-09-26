# Kế hoạch lãi kép (Compound Growth Plan) — Design

**Date:** 2026-09-15
**Area:** Journal → tab Thống kê
**Status:** approved, chưa implement

## Vấn đề

Trader đặt mục tiêu kiểu "lãi kép X%/ngày để từ $1,000 lên $1,000,000" nhưng
không có công cụ nào trong app theo dõi: target/dừng lỗ của HÔM NAY dựa trên
vốn thực tế (không phải vốn gốc cố định), và tiến độ thực tế so với đích cuối.
`TradingGoal` hiện có là mục tiêu tháng cố định (win rate, R, PnL) — không
compounding, không theo ngày.

## Giải pháp

Model + component mới, advisory-only (không chặn log trade, không đụng
`risk-budget.ts`/`daily-limit.ts`). 1 kế hoạch/user, ghi đè khi sửa. Vốn hiện
tại luôn tính động từ `startingCapital + Σ TradeJournal.pnl` — không lưu số dư
riêng, không thể lệch dữ liệu.

## Schema — `CompoundGrowthPlan`

```prisma
model CompoundGrowthPlan {
  id                 String   @id @default(cuid())
  userId             String   @unique
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  startingCapital    Float
  targetCapital      Float
  dailyTargetPercent Float
  dailyStopPercent   Float
  startDate          DateTime
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}
```

`startDate` reset về thời điểm sửa mỗi khi user ghi đè kế hoạch (chỉ PnL từ
`startDate` trở đi được tính vào vốn hiện tại).

## Module — `src/lib/journal/compound-plan.ts`

Hàm thuần `computeCompoundPlanProgress(plan, closedTrades)`, không đụng DB
(pattern giống `goal-progress.ts`), input `closedTrades` là các `TradeJournal`
đã đóng có `closedAt >= plan.startDate`.

### Các bước tính

1. **Vốn hiện tại** = `startingCapital + Σ pnl` (toàn bộ `closedTrades`).
2. **Vốn đầu ngày hôm nay** = vốn hiện tại − Σ `pnl` của các trade đóng trong
   ngày UTC hôm nay (dùng `utcDayRange()` từ `daily-limit.ts` cho nhất quán).
3. **Target hôm nay** = vốn đầu ngày × `dailyTargetPercent / 100`.
   **Dừng lỗ hôm nay** = vốn đầu ngày × `dailyStopPercent / 100`.
4. **PnL hôm nay** = Σ `pnl` các trade đóng trong ngày UTC hôm nay.
5. **Trạng thái hôm nay**: `target-hit` (PnL hôm nay ≥ target) | `stop-hit`
   (PnL hôm nay ≤ −dừng lỗ) | `in-progress`.
6. **Số ngày giao dịch đã qua** = số ngày UTC riêng biệt có ≥1 trade closed kể
   từ `startDate` (không tính ngày nghỉ).
7. **Tốc độ thực tế/ngày** = `(currentCapital / startingCapital)^(1/tradingDaysElapsed) − 1`,
   chỉ tính khi `tradingDaysElapsed >= 1`.
8. **ETA đến `targetCapital`**:
   - Nếu `currentCapital >= targetCapital`: trạng thái `goal-reached`.
   - Nếu có tốc độ thực tế và tốc độ > 0: `daysRemaining = ceil(ln(targetCapital/currentCapital) / ln(1+realizedDailyRate))`, hiển thị kèm ngày dự kiến.
   - Nếu chưa có ngày giao dịch nào (`tradingDaysElapsed === 0`): fallback dùng
     `dailyTargetPercent` cấu hình, gắn nhãn "ước tính theo mục tiêu, chưa có
     dữ liệu thực tế".
   - Nếu tốc độ thực tế ≤ 0: không tính ETA, trả trạng thái `stalled` kèm
     cảnh báo "tốc độ hiện tại đang âm/đứng yên, chưa thể ước tính".

### Output

```ts
type CompoundPlanProgress = {
  currentCapital: number;
  todayStartCapital: number;
  todayTargetAmount: number;
  todayStopAmount: number;
  todayPnl: number;
  todayStatus: "target-hit" | "stop-hit" | "in-progress";
  tradingDaysElapsed: number;
  realizedDailyRatePercent: number | null;
  progressPercent: number; // ln(currentCapital / startingCapital) / ln(targetCapital / startingCapital), clamp [0,100] (thang log — lãi kép)
  eta:
    | { kind: "reached" }
    | { kind: "projected"; daysRemaining: number; estimatedDate: Date; basedOnActual: boolean }
    | { kind: "stalled" };
};
```

## Server action — `src/actions/compound-plan.ts`

`saveCompoundPlan(input)` theo pattern chuẩn: `auth()` → `rateLimit()` → Zod
(`startingCapital > 0`, `targetCapital > startingCapital`, `0 < dailyTargetPercent <= 100`,
`0 < dailyStopPercent <= 100`) → `prisma.compoundGrowthPlan.upsert` (set
`startDate = new Date()` mỗi lần ghi) → `revalidateLocalizedPath("/journal")`.

## UI — `src/components/journal/journal-compound-plan-card.tsx`

Render trong `journal-advanced-stats.tsx`, cạnh `JournalGoalTracker`.

- **Chưa có plan**: form 4 input (vốn gốc, mục tiêu vốn cuối, % lãi/ngày, %
  dừng lỗ/ngày) + nút "Tạo kế hoạch".
- **Đã có plan**:
  - Hàng số liệu: Vốn hiện tại | Target hôm nay (+$X) | Dừng lỗ hôm nay (−$Y) |
    badge trạng thái hôm nay (`target-hit` xanh / `stop-hit` đỏ / `in-progress` xám).
  - Progress bar tới `targetCapital` (`progressPercent`).
  - Dòng ETA theo `eta.kind`:
    - `reached`: "🎉 Đã đạt mục tiêu vốn."
    - `projected`: "Với tốc độ thực tế ~X%/ngày, dự kiến đạt {targetCapital}
      vào khoảng {estimatedDate}, còn {daysRemaining} ngày giao dịch." (thêm
      "(ước tính theo mục tiêu, chưa có dữ liệu thực tế)" nếu `basedOnActual === false`).
    - `stalled`: cảnh báo màu vàng "Tốc độ hiện tại đang âm/đứng yên, chưa thể
      ước tính thời gian đạt mục tiêu."
  - Nút "Sửa kế hoạch" mở lại form, prefill `startingCapital` = vốn hiện tại
    (cho sửa), reset `startDate`.
- Không chặn log trade nào, không đụng risk-budget/daily-limit.
- Không có biểu đồ đường vốn ở bản đầu (out of scope, xem dưới).

Props từ `page.tsx`: `computeCompoundPlanProgress(plan, closedTradesSinceStart)`.

## i18n

Namespace `journal.compoundPlan.*` (title, form labels, badge/status labels,
3 dòng ETA, nút sửa) — thêm vào cả `messages/vi.json` và `messages/en.json`.

## Test — `compound-plan.test.ts`

- Vốn hiện tại đúng khi có/không có trade từ `startDate`.
- Vốn đầu ngày loại đúng PnL của hôm nay.
- Target/dừng lỗ hôm nay tính đúng theo vốn đầu ngày.
- 3 trạng thái hôm nay: `target-hit`, `stop-hit`, `in-progress`.
- Tốc độ thực tế + ETA `projected` (basedOnActual true) đúng công thức.
- Fallback ETA khi `tradingDaysElapsed === 0` (basedOnActual false).
- `stalled` khi tốc độ thực tế ≤ 0.
- `reached` khi `currentCapital >= targetCapital`.
- `progressPercent` clamp đúng [0, 100].

## Ngoài phạm vi

- Biểu đồ đường vốn (thực tế vs lý tưởng) — có thể thêm sau, tái dùng pattern
  `provider-equity-chart.tsx`.
- Lấy vốn từ MT5 `Mt5Connection.balance/equity` thay vì cộng dồn `TradeJournal.pnl`.
- Chặn/cảnh báo mạnh trong Risk Guard khi đạt target/stop (giữ thuần advisory).
- Giữ lịch sử nhiều kế hoạch (chỉ 1 plan/user, ghi đè).
