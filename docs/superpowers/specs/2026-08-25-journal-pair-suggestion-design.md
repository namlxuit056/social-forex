# Journal: Đề xuất cặp tiền nên trade

## Vấn đề

Tab Edge (`/journal?tab=edge`) đã tính win rate theo symbol/session/setup và cảnh báo symbol tệ nhất (`worstSymbol` banner), nhưng chưa có gợi ý tích cực: "bạn nên ưu tiên trade cặp nào".

## Giải pháp

Thêm `computeBestPairSuggestion()` trong `src/lib/journal/edge-stats.ts`, tái dùng `computeEdgeGroups` + `findBestRow` đã có:

1. Tìm symbol có win rate cao nhất trong toàn bộ trades (`findBestRow(groups.symbols, minTrades=5)`), giữ ngưỡng ≥5 lệnh W/L giống `bestSetup` hiện có ở `journal-header.tsx`.
2. Lọc trades của symbol đó, chạy lại `computeEdgeGroups` trên tập con để tìm session/setup tốt nhất **riêng cho symbol đó** — ngưỡng thấp hơn (3 lệnh) vì tập con nhỏ.
3. Trả về `null` nếu chưa đủ dữ liệu.

```ts
export type PairSuggestion = {
  symbol: string;
  winRate: number;
  total: number;
  pnl: number;
  bestSession: EdgeRow | null;
  bestSetup: EdgeRow | null;
};

export function computeBestPairSuggestion(
  trades: EdgeTrade[],
  minTrades = 5,
): PairSuggestion | null;
```

Không đổi `page.tsx` hay DB — `JournalEdgeAnalytics` đã nhận `trades` prop, tính suggestion bằng `useMemo` phía client như các group khác.

## UI

Trong `journal-edge-analytics.tsx`, thêm 1 card màu emerald (đối lập banner amber `worstSymbol`), đặt ngay phía trên banner đó khi có dữ liệu:

> 💡 Cặp tốt nhất của bạn: **EURUSD** — 68% winrate (12 lệnh, +$340). Hiệu quả nhất khi trade phiên **London** với setup **Breakout**.

Phần session/setup chỉ hiện khi có (`bestSession`/`bestSetup` không null); nếu không có thì chỉ hiện dòng symbol.

## i18n

Thêm vào `messages/vi.json` và `messages/en.json` namespace `journal`:
- `pairSuggestionHint` (params: `symbol`, `winRate`, `count`, `pnl`)
- `pairSuggestionSessionHint` (params: `session`)
- `pairSuggestionSetupHint` (params: `setup`)

## Test

`src/lib/journal/edge-stats.test.ts`: case đủ dữ liệu (symbol + session + setup con), thiếu dữ liệu tổng thể (null), đủ symbol nhưng thiếu dữ liệu session/setup con (session/setup null, symbol vẫn có).

## Ngoài phạm vi

Không dùng dữ liệu thị trường real-time/AI — chỉ dựa lịch sử journal cá nhân. Không hiển thị top-3, chỉ 1 cặp tốt nhất.
