export type Lesson = {
  slug: string;
  title: string;
  level: "beginner" | "intermediate" | "advanced";
  summary: string;
  body: string;
};

export const academyLessons: Lesson[] = [
  {
    slug: "risk-1pct",
    title: "Quy tắc 1–2% rủi ro mỗi lệnh",
    level: "beginner",
    summary: "Cách xác định lot dựa trên stop và vốn để không cháy tài khoản sau chuỗi thua.",
    body: `## Tại sao quản lý rủi ro quan trọng?

Phần lớn trader mất tiền không phải vì phân tích sai — mà vì **đặt lot quá lớn** so với vốn. Quy tắc 1–2% giúp bạn sống sót qua chuỗi thua dài.

## Cách tính

**Công thức:**

Lot = (Vốn × % rủi ro) ÷ (SL pips × Giá trị 1 pip)

**Ví dụ:** Vốn $10.000, rủi ro 1% = $100. SL = 50 pips trên EUR/USD (1 pip = $10/standard lot).

→ Lot = $100 ÷ (50 × $10) = 0.2 lot (2 mini lots).

## Quy tắc vàng

- **Không bao giờ rủi ro quá 2%** mỗi lệnh, dù bạn tự tin đến đâu.
- Chuỗi 10 lệnh thua liên tiếp với 1% rủi ro chỉ mất ~9.6% vốn — hoàn toàn phục hồi được.
- Với 5% rủi ro/lệnh, 10 thua liên tiếp mất 40% — rất khó phục hồi.

## Công cụ hỗ trợ

Sử dụng trang **Công cụ** trên Social Forex để tính position size tự động — chỉ cần nhập vốn, % rủi ro và số pip SL.`,
  },
  {
    slug: "spread-liquidity",
    title: "Spread, thanh khoản và giờ vàng",
    level: "beginner",
    summary: "Tại sao chi phí giao dịch thay đổi theo phiên London/New York.",
    body: `## Spread là gì?

Spread là khoảng chênh lệch giữa giá Bid (bán) và giá Ask (mua). Đây là **chi phí ngầm** của mỗi giao dịch.

## Tại sao spread thay đổi?

Spread phụ thuộc vào **thanh khoản** — số lượng người mua/bán sẵn sàng giao dịch tại một thời điểm.

| Phiên | Giờ VN | Thanh khoản | Spread |
|-------|--------|-------------|--------|
| Sydney | 5:00–14:00 | Thấp | Rộng |
| Tokyo | 6:00–15:00 | Trung bình | Trung bình |
| London | 14:00–23:00 | Cao | Hẹp |
| New York | 19:00–04:00 | Cao | Hẹp |

## "Giờ vàng" giao dịch

**Overlap London–New York (19:00–23:00 VN):** thanh khoản cao nhất trong ngày. Spread thấp nhất, biến động rõ ràng nhất. Đây là thời điểm lý tưởng cho day trading.

## Lưu ý

- **Tránh giao dịch lúc tin quan trọng** (NFP, CPI) nếu không có kinh nghiệm — spread có thể mở rộng 5–10 lần.
- AUD, NZD thanh khoản tốt nhất trong phiên Sydney–Tokyo.
- EUR/USD luôn có spread thấp nhất vì là cặp giao dịch nhiều nhất thế giới.`,
  },
  {
    slug: "price-action",
    title: "Khung Price Action cơ bản",
    level: "intermediate",
    summary: "Mô hình nến, vùng cung cầu và cách đặt stop hợp lý.",
    body: `## Price Action là gì?

Price Action là phương pháp phân tích **chỉ dựa trên hành vi giá** — nến Nhật, cấu trúc thị trường, hỗ trợ/kháng cự — không dùng indicator.

## 3 mô hình nến quan trọng nhất

### 1. Pin Bar (Rejection)
Nến có **bóng dài** (ít nhất 2/3 thân nến), thân nhỏ. Cho thấy giá bị từ chối tại một vùng.
- Pin bar đuôi dài xuất hiện tại hỗ trợ → tín hiệu mua.
- Pin bar đuôi dài xuất hiện tại kháng cự → tín hiệu bán.

### 2. Engulfing
Nến sau **bao trùm hoàn toàn** thân nến trước. Bullish engulfing tại hỗ trợ = tín hiệu mua mạnh.

### 3. Inside Bar
Nến nhỏ nằm **trong phạm vi** nến trước — thị trường đang tích lũy. Breakout theo hướng nào → vào lệnh hướng đó.

## Vùng cung cầu (Supply & Demand)

- **Demand zone:** vùng giá trước đó tạo đáy mạnh rồi tăng nhanh. Khi giá quay lại → kỳ vọng người mua quay lại.
- **Supply zone:** ngược lại — vùng giá giảm mạnh. Khi giá quay lại → kỳ vọng người bán quay lại.

## Đặt Stop Loss hợp lý

- SL đặt **ngoài vùng cung cầu** hoặc ngoài bóng nến tín hiệu.
- Không đặt SL tại số tròn (1.1000, 1.0500) vì đây là vùng hay bị "quét".
- Cho thêm 5–10 pip buffer bên ngoài.`,
  },
  {
    slug: "news-trading",
    title: "Giao dịch theo tin: trước và sau sự kiện",
    level: "intermediate",
    summary: "CPI, NFP: kỳ vọng vs thực tế và biến động implied.",
    body: `## Giao dịch tin tức forex

Các sự kiện kinh tế lớn (NFP, CPI, quyết định lãi suất) tạo biến động mạnh. Hiểu cách thị trường phản ứng giúp bạn tận dụng — hoặc tránh rủi ro.

## Cách thị trường phản ứng

Giá không phản ứng với **số liệu tuyệt đối**, mà phản ứng với **chênh lệch giữa kỳ vọng và thực tế**.

| Trường hợp | Phản ứng |
|------------|----------|
| Actual > Forecast (tốt hơn kỳ vọng) | Đồng tiền tăng |
| Actual < Forecast (xấu hơn kỳ vọng) | Đồng tiền giảm |
| Actual ≈ Forecast | Ít biến động, có thể đảo chiều |

## 5 tin quan trọng nhất

1. **NFP (Non-Farm Payrolls)** — thứ 6 đầu tiên mỗi tháng, 19:30 VN
2. **CPI (Lạm phát)** — giữa tháng
3. **Quyết định lãi suất** (Fed, ECB, BOE, BOJ)
4. **GDP** — hàng quý
5. **PMI** — đầu tháng

## Chiến lược an toàn

- **Trước tin:** Thu hẹp hoặc đóng vị thế. Spread mở rộng, slippage cao.
- **Sau tin (15–30 phút):** Chờ nến đóng cửa, xác nhận hướng đi. Vào lệnh khi spread trở lại bình thường.
- **Straddle:** Đặt pending order cả 2 phía trước tin — rủi ro cao, chỉ dùng khi hiểu rõ.

## Công cụ

Xem trang **Lịch kinh tế** trên Social Forex để theo dõi sự kiện theo múi giờ VN/UTC.`,
  },
  {
    slug: "smc-intro",
    title: "Giới thiệu Smart Money Concepts",
    level: "advanced",
    summary: "Order blocks, BOS/CHoCH — khung nhìn tổ chức (mang tính học thuật).",
    body: `## Smart Money Concepts (SMC) là gì?

SMC là khung phân tích dựa trên giả thuyết rằng **"smart money" (tổ chức, ngân hàng)** tạo ra các chuyển động giá chính, và trader nhỏ lẻ có thể nhận biết dấu vết của họ.

## Các khái niệm cốt lõi

### Break of Structure (BOS)
Khi giá phá vỡ **đỉnh cao hơn** trong uptrend hoặc **đáy thấp hơn** trong downtrend → xác nhận xu hướng tiếp tục.

### Change of Character (CHoCH)
Khi giá phá vỡ cấu trúc **ngược hướng** xu hướng hiện tại → tín hiệu đảo chiều tiềm năng.

### Order Block (OB)
Nến cuối cùng trước khi giá di chuyển mạnh. Ý tưởng: đây là vùng tổ chức đặt lệnh lớn.
- **Bullish OB:** nến giảm cuối cùng trước đợt tăng mạnh.
- **Bearish OB:** nến tăng cuối cùng trước đợt giảm mạnh.

### Fair Value Gap (FVG)
Khoảng trống giá giữa 3 nến liên tiếp — khi nến giữa không có overlap với nến trước và sau. Giá thường quay lại "lấp" FVG.

### Liquidity
- **Buy-side liquidity:** tập trung stop loss của sell orders phía trên các đỉnh → giá thường sweep lên để "grab" trước khi đảo chiều.
- **Sell-side liquidity:** ngược lại, phía dưới các đáy.

## Lưu ý quan trọng

- SMC **không phải khoa học chính xác** — đây là một khung giải thích, không phải quy luật.
- Kết hợp với quản lý rủi ro (1–2% rule) để tránh over-trade.
- Backtesting trên dữ liệu lịch sử trước khi áp dụng vào tài khoản thật.
- Không có phương pháp nào đúng 100% — discipline quan trọng hơn setup.`,
  },
];
