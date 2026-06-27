export type AcademyLocale = "en" | "vi";

export type Lesson = {
  slug: string;
  title: string;
  level: "beginner" | "intermediate" | "advanced";
  summary: string;
  body: string;
  keywords: string[];
};

type LocalizedLesson = {
  slug: string;
  level: Lesson["level"];
  en: Omit<Lesson, "slug" | "level">;
  vi: Omit<Lesson, "slug" | "level">;
};

function lesson(
  slug: string,
  level: Lesson["level"],
  en: Omit<Lesson, "slug" | "level">,
  vi: Omit<Lesson, "slug" | "level">,
): LocalizedLesson {
  return { slug, level, en, vi };
}

const localizedLessons: LocalizedLesson[] = [
  lesson(
    "how-to-read-forex-economic-calendar",
    "beginner",
    {
      title: "How to read a forex economic calendar",
      summary:
        "A beginner guide to event time, currency, impact, forecast, previous and actual numbers.",
      keywords: [
        "forex economic calendar",
        "how to read economic calendar",
        "forex news for beginners",
      ],
      body: `## Why the economic calendar matters

A forex economic calendar helps you see when market-moving data is scheduled. For beginners, it is less about predicting every move and more about avoiding surprise volatility.

## The main columns

- **Time:** when the event is released. Always check whether the calendar uses your local timezone or UTC.
- **Currency:** the currency most likely to react, such as USD, EUR, GBP or JPY.
- **Impact:** a rough estimate of expected volatility. High impact events deserve extra caution.
- **Previous:** the last reported number.
- **Forecast:** what analysts expect this time.
- **Actual:** the released number.

## How to read the result

Markets often react to the difference between actual and forecast, not just whether a number is high or low. A stronger-than-expected US jobs report can support USD, while weak inflation may reduce expectations for rate hikes.

## Practical routine

- Check high impact events before opening a trade.
- Avoid placing tight stops minutes before major news.
- Wait 15-30 minutes after the release if spreads are unstable.
- Use Social Forex Calendar to switch between VN time and UTC.

Educational note: news trading is risky. Use the calendar as context, not as a promise of direction.`,
    },
    {
      title: "Cách đọc lịch kinh tế forex cho người mới",
      summary:
        "Hướng dẫn đọc thời gian, đồng tiền, mức ảnh hưởng, forecast, previous và actual.",
      keywords: [
        "cách đọc lịch kinh tế forex",
        "lịch kinh tế forex",
        "tin tức forex cho người mới",
      ],
      body: `## Vì sao lịch kinh tế quan trọng

Lịch kinh tế forex cho biết khi nào dữ liệu có khả năng làm thị trường biến động được công bố. Với người mới, mục tiêu đầu tiên không phải đoán đúng mọi hướng đi, mà là tránh bị bất ngờ bởi tin mạnh.

## Các cột cần hiểu

- **Thời gian:** lúc tin được công bố. Luôn kiểm tra lịch đang hiển thị giờ Việt Nam hay UTC.
- **Đồng tiền:** đồng có khả năng phản ứng mạnh, ví dụ USD, EUR, GBP hoặc JPY.
- **Mức ảnh hưởng:** ước lượng độ biến động. Tin high impact cần thận trọng hơn.
- **Previous:** số liệu kỳ trước.
- **Forecast:** kỳ vọng của thị trường.
- **Actual:** số liệu thực tế vừa công bố.

## Cách đọc kết quả

Giá thường phản ứng với chênh lệch giữa actual và forecast, không chỉ vì con số cao hay thấp. Ví dụ việc làm Mỹ mạnh hơn kỳ vọng có thể hỗ trợ USD, còn lạm phát yếu có thể làm giảm kỳ vọng tăng lãi suất.

## Quy trình thực tế

- Kiểm tra tin high impact trước khi vào lệnh.
- Tránh đặt stop quá sát vài phút trước tin lớn.
- Chờ 15-30 phút sau tin nếu spread còn giãn.
- Dùng Lịch kinh tế Social Forex để đổi giữa giờ VN và UTC.

Lưu ý giáo dục: giao dịch theo tin rủi ro cao. Hãy dùng lịch như bối cảnh, không phải cam kết hướng đi.`,
    },
  ),
  lesson(
    "risk-reward-ratio-explained",
    "beginner",
    {
      title: "Risk reward ratio explained",
      summary:
        "What 1:2 or 1:3 risk reward means, how to calculate it, and why win rate is not enough.",
      keywords: ["risk reward ratio", "what is risk reward", "forex risk management"],
      body: `## What is risk reward?

Risk reward compares how much you may lose if the stop loss is hit with how much you may gain if the take profit is reached.

## Simple formula

Risk reward = potential profit / potential loss

If your stop loss is 50 pips and your target is 100 pips, the setup has a 1:2 risk reward ratio.

## Why it matters

A trader can be profitable with a win rate below 50% if average wins are meaningfully larger than average losses. The opposite is also true: a high win rate can still lose money if losses are too large.

## Example

- Account risk per trade: $100
- Target reward: $200
- Risk reward: 1:2

With 4 wins and 6 losses: wins add $800, losses subtract $600, net result is +$200 before costs.

## Practical tips

- Mark entry, stop loss and take profit before entering.
- Avoid moving stop loss farther away after entry.
- Do not force a 1:3 target if the chart structure does not support it.
- Combine risk reward with position sizing.

Risk reward is a planning tool. It does not make a weak trade strong by itself.`,
    },
    {
      title: "Risk reward là gì? Cách tính R:R trong forex",
      summary:
        "Hiểu tỷ lệ 1:2, 1:3, cách tính và vì sao tỷ lệ thắng chưa đủ để đánh giá chiến lược.",
      keywords: ["risk reward là gì", "tỷ lệ rr forex", "quản lý rủi ro forex"],
      body: `## Risk reward là gì?

Risk reward so sánh số tiền bạn có thể mất nếu chạm stop loss với số tiền có thể lời nếu đạt take profit.

## Công thức đơn giản

Risk reward = lợi nhuận kỳ vọng / rủi ro kỳ vọng

Nếu stop loss là 50 pip và mục tiêu là 100 pip, setup có tỷ lệ 1:2.

## Vì sao quan trọng

Một trader vẫn có thể có lợi nhuận dù tỷ lệ thắng dưới 50% nếu lệnh thắng trung bình lớn hơn lệnh thua. Ngược lại, tỷ lệ thắng cao vẫn có thể lỗ nếu mỗi lệnh thua quá lớn.

## Ví dụ

- Rủi ro mỗi lệnh: $100
- Mục tiêu lợi nhuận: $200
- Risk reward: 1:2

Nếu có 4 lệnh thắng và 6 lệnh thua: thắng +$800, thua -$600, kết quả +$200 trước chi phí.

## Mẹo thực tế

- Xác định entry, stop loss và take profit trước khi vào lệnh.
- Không kéo stop loss xa hơn sau khi vào lệnh.
- Không ép target 1:3 nếu cấu trúc giá không ủng hộ.
- Kết hợp R:R với tính lot.

Risk reward là công cụ lập kế hoạch, không biến một setup yếu thành setup mạnh.`,
    },
  ),
  lesson(
    "how-to-calculate-forex-lot-size",
    "beginner",
    {
      title: "How to calculate forex lot size",
      summary:
        "Learn the position size formula using account balance, risk percentage, stop loss and pip value.",
      keywords: ["how to calculate forex lot size", "position size calculator", "forex lot size"],
      body: `## What is lot size?

Lot size is the trade volume you choose. In forex, it controls how much each pip movement affects your account.

## The position size formula

Lot size = money at risk / (stop loss in pips x pip value per lot)

If your account is $1,000 and you risk 1%, your money at risk is $10. With a 50 pip stop loss and $10 pip value per standard lot:

Lot size = 10 / (50 x 10) = 0.02 standard lots

## Why beginners often get it wrong

Many new traders pick lot size first, then search for a stop loss. That reverses the process. The safer order is:

- Decide account risk percentage.
- Place stop loss where the setup is invalid.
- Calculate lot size from that distance.

## What changes by instrument

Pip value can differ between currency pairs, gold, indices and crypto CFDs. XAUUSD lot sizing is not the same as EURUSD lot sizing.

## Use a calculator

Use the Social Forex trading calculator to estimate lot size before placing a trade. Recheck contract details with your broker because specifications can vary.`,
    },
    {
      title: "Cách tính lot forex theo vốn và stop loss",
      summary:
        "Học công thức position size dựa trên vốn, phần trăm rủi ro, stop loss và giá trị pip.",
      keywords: ["cách tính lot forex", "máy tính lot forex", "position size forex"],
      body: `## Lot size là gì?

Lot size là khối lượng giao dịch. Trong forex, lot quyết định mỗi pip di chuyển ảnh hưởng bao nhiêu đến tài khoản.

## Công thức tính lot

Lot = số tiền rủi ro / (stop loss theo pip x giá trị pip mỗi lot)

Nếu tài khoản $1.000 và rủi ro 1%, số tiền rủi ro là $10. Với stop loss 50 pip và giá trị pip $10 cho 1 standard lot:

Lot = 10 / (50 x 10) = 0.02 lot

## Lỗi phổ biến của người mới

Nhiều trader chọn lot trước rồi mới tìm chỗ đặt stop loss. Thứ tự đó ngược. Quy trình an toàn hơn là:

- Chọn phần trăm rủi ro của tài khoản.
- Đặt stop loss tại nơi setup bị vô hiệu.
- Tính lot dựa trên khoảng cách stop loss.

## Mỗi sản phẩm có thể khác nhau

Giá trị pip có thể khác giữa cặp tiền, vàng, chỉ số và crypto CFD. Cách tính lot XAUUSD không hoàn toàn giống EURUSD.

## Nên dùng máy tính

Dùng công cụ tính lot trên Social Forex trước khi vào lệnh. Luôn kiểm tra lại thông số hợp đồng với broker vì mỗi sàn có thể khác nhau.`,
    },
  ),
  lesson(
    "nonfarm-payrolls-gold-xauusd",
    "intermediate",
    {
      title: "How Non-Farm Payrolls can affect gold and XAUUSD",
      summary:
        "Understand why US jobs data can move the dollar, yields and gold prices.",
      keywords: ["nonfarm payrolls gold", "NFP XAUUSD", "how NFP affects gold"],
      body: `## What is Non-Farm Payrolls?

Non-Farm Payrolls, often called NFP, is a monthly US jobs report. It is usually released on the first Friday of the month and can create strong volatility in USD pairs and gold.

## Why gold reacts

Gold is commonly priced in USD. When NFP changes expectations for US interest rates, the US dollar and bond yields can move sharply. Gold often reacts to those shifts.

## Basic reaction map

- Stronger jobs data can support USD and yields, which may pressure gold.
- Weaker jobs data can reduce rate hike expectations, which may support gold.
- Mixed data can create whipsaw moves.

## Watch more than one number

The headline payroll number matters, but traders also watch unemployment rate, average hourly earnings and revisions to previous months.

## Safer routine for beginners

- Mark NFP time on the calendar.
- Avoid opening new XAUUSD trades minutes before the release.
- Let the first spike settle before making decisions.
- Compare the actual data with forecast and revisions.

NFP can create opportunity, but it can also create slippage and spread expansion. Treat it as high-risk news.`,
    },
    {
      title: "Nonfarm ảnh hưởng vàng XAUUSD như thế nào?",
      summary:
        "Hiểu vì sao dữ liệu việc làm Mỹ có thể làm USD, lợi suất trái phiếu và giá vàng biến động.",
      keywords: ["nonfarm ảnh hưởng vàng", "NFP XAUUSD", "tin nonfarm vàng"],
      body: `## Non-Farm Payrolls là gì?

Non-Farm Payrolls, thường gọi là NFP hoặc Nonfarm, là báo cáo việc làm hàng tháng của Mỹ. Tin này thường công bố vào thứ Sáu đầu tiên của tháng và có thể làm USD cùng vàng biến động mạnh.

## Vì sao vàng phản ứng?

Vàng thường được định giá bằng USD. Khi NFP làm thay đổi kỳ vọng lãi suất Mỹ, đồng USD và lợi suất trái phiếu có thể biến động mạnh. XAUUSD thường phản ứng theo các thay đổi đó.

## Bản đồ phản ứng cơ bản

- Việc làm mạnh hơn kỳ vọng có thể hỗ trợ USD và lợi suất, gây áp lực lên vàng.
- Việc làm yếu hơn kỳ vọng có thể giảm kỳ vọng tăng lãi suất, hỗ trợ vàng.
- Dữ liệu trái chiều có thể làm giá giật hai đầu.

## Không chỉ nhìn headline

Ngoài số việc làm mới, trader còn theo dõi tỷ lệ thất nghiệp, thu nhập bình quân theo giờ và số liệu điều chỉnh của tháng trước.

## Quy trình an toàn cho người mới

- Đánh dấu giờ Nonfarm trên lịch kinh tế.
- Tránh mở lệnh XAUUSD mới vài phút trước tin.
- Chờ cú spike đầu tiên ổn định trước khi quyết định.
- So sánh actual với forecast và các số liệu điều chỉnh.

Nonfarm có thể tạo cơ hội nhưng cũng dễ gây trượt giá và giãn spread. Hãy xem đây là tin rủi ro cao.`,
    },
  ),
  lesson(
    "forex-backtesting-for-beginners",
    "beginner",
    {
      title: "Forex backtesting for beginners",
      summary:
        "A simple framework to test a strategy before risking real money.",
      keywords: ["forex backtesting for beginners", "how to backtest forex", "trading strategy test"],
      body: `## What is backtesting?

Backtesting means checking how a trading idea would have performed on historical charts. It helps you learn whether the rules are clear enough to repeat.

## Define rules first

Before testing, write down:

- Market and timeframe.
- Entry condition.
- Stop loss rule.
- Take profit rule.
- Time to avoid, such as high impact news.

## Track the right data

For every sample trade, record entry, stop, target, result, risk reward, screenshot and notes. A journal makes weak patterns easier to spot.

## Sample size

Ten trades are not enough. Aim for at least 50-100 examples before forming an opinion. More samples are better when the setup appears rarely.

## Avoid hindsight bias

Do not move entries or stops after seeing the result. Replay tools or bar-by-bar review help reduce this bias.

Backtesting does not guarantee future profit, but it can stop you from trading vague ideas with real money.`,
    },
    {
      title: "Backtest chiến lược forex cho người mới",
      summary:
        "Khung đơn giản để kiểm tra một chiến lược trước khi dùng tiền thật.",
      keywords: ["backtest chiến lược forex", "cách backtest forex", "kiểm tra chiến lược trading"],
      body: `## Backtest là gì?

Backtest là kiểm tra một ý tưởng giao dịch trên dữ liệu quá khứ. Việc này giúp bạn biết bộ quy tắc có đủ rõ để lặp lại hay không.

## Viết quy tắc trước

Trước khi test, hãy ghi rõ:

- Sản phẩm và khung thời gian.
- Điều kiện vào lệnh.
- Quy tắc đặt stop loss.
- Quy tắc take profit.
- Thời điểm cần tránh, ví dụ tin high impact.

## Ghi dữ liệu cần thiết

Với mỗi mẫu lệnh, ghi entry, stop, target, kết quả, risk reward, ảnh chụp chart và ghi chú. Nhật ký giúp bạn nhận ra điểm yếu dễ hơn.

## Cỡ mẫu

10 lệnh là quá ít. Hãy cố gắng có ít nhất 50-100 mẫu trước khi kết luận. Nếu setup ít xuất hiện, cần nhiều dữ liệu hơn.

## Tránh hindsight bias

Đừng dời entry hoặc stop sau khi đã thấy kết quả. Replay từng nến hoặc xem từng đoạn chart sẽ giảm thiên kiến này.

Backtest không đảm bảo lợi nhuận tương lai, nhưng giúp bạn tránh giao dịch ý tưởng mơ hồ bằng tiền thật.`,
    },
  ),
  lesson(
    "xauusd-risk-management",
    "intermediate",
    {
      title: "How to manage risk when trading XAUUSD",
      summary:
        "Gold can move fast. Learn position sizing, stop placement and news risk basics.",
      keywords: ["XAUUSD risk management", "gold trading risk", "manage risk trading gold"],
      body: `## Why XAUUSD needs extra care

XAUUSD often moves faster than major currency pairs. A normal-looking candle on gold can equal a large dollar move, especially during US data releases.

## Start with account risk

Decide the amount you are willing to lose before thinking about profit. Many educational frameworks use 1% or less per trade for beginners.

## Stop loss placement

Place the stop where the trade idea is invalid, not where the loss simply feels comfortable. Then calculate lot size from that distance.

## Watch news and sessions

Gold often reacts to US CPI, NFP, Fed decisions, yields and USD moves. Liquidity is usually better during London and New York sessions.

## Practical checklist

- Check the economic calendar before trading.
- Avoid oversized lots on small accounts.
- Do not widen stop loss after entry.
- Keep a journal of gold trades separately from FX pairs.
- Demo test first if you are unfamiliar with XAUUSD contract size.

Gold trading is not safer just because it is popular. Risk control comes first.`,
    },
    {
      title: "Cách quản lý rủi ro khi giao dịch XAUUSD",
      summary:
        "Vàng biến động nhanh. Học cách tính lot, đặt stop và kiểm soát rủi ro tin tức.",
      keywords: ["cách quản lý rủi ro XAUUSD", "giao dịch vàng rủi ro", "quản lý vốn vàng forex"],
      body: `## Vì sao XAUUSD cần cẩn thận hơn

XAUUSD thường di chuyển nhanh hơn các cặp tiền chính. Một cây nến nhìn bình thường trên vàng có thể tương đương mức biến động USD lớn, đặc biệt khi có tin Mỹ.

## Bắt đầu từ rủi ro tài khoản

Hãy xác định số tiền chấp nhận mất trước khi nghĩ đến lợi nhuận. Nhiều khung học tập dùng 1% hoặc thấp hơn mỗi lệnh cho người mới.

## Đặt stop loss

Stop loss nên nằm ở nơi ý tưởng giao dịch bị sai, không phải nơi khiến bạn thấy dễ chịu. Sau đó tính lot dựa trên khoảng cách stop.

## Theo dõi tin và phiên

Vàng thường phản ứng với CPI Mỹ, NFP, quyết định Fed, lợi suất và biến động USD. Thanh khoản thường tốt hơn trong phiên London và New York.

## Checklist thực tế

- Kiểm tra lịch kinh tế trước khi giao dịch.
- Tránh lot quá lớn với tài khoản nhỏ.
- Không nới stop loss sau khi vào lệnh.
- Ghi nhật ký lệnh vàng riêng với cặp tiền.
- Test demo nếu chưa hiểu contract size của XAUUSD.

Vàng không an toàn hơn chỉ vì phổ biến. Quản lý rủi ro phải đứng đầu.`,
    },
  ),
  lesson(
    "forex-spread-and-slippage",
    "beginner",
    {
      title: "Forex spread and slippage explained",
      summary:
        "Understand trading costs, why spreads widen and how slippage affects entries and exits.",
      keywords: ["forex spread explained", "forex slippage", "trading costs forex"],
      body: `## What is spread?

Spread is the difference between bid and ask price. It is one of the most visible costs of trading.

## What is slippage?

Slippage happens when your order is filled at a different price than expected. It can happen during fast markets, low liquidity or major news.

## When costs increase

- Around high impact economic releases.
- During market open or rollover.
- On less liquid currency pairs.
- When volatility spikes suddenly.

## How to reduce the impact

- Avoid trading seconds before major news.
- Use limit orders when exact entry matters.
- Give stop loss enough room for normal spread.
- Compare average costs, not just the best advertised spread.

Spread and slippage are part of real trading. Any backtest should include estimated costs.`,
    },
    {
      title: "Spread và trượt giá forex là gì?",
      summary:
        "Hiểu chi phí giao dịch, vì sao spread giãn và slippage ảnh hưởng entry/exit.",
      keywords: ["spread forex là gì", "trượt giá forex", "chi phí giao dịch forex"],
      body: `## Spread là gì?

Spread là chênh lệch giữa giá bid và ask. Đây là một trong những chi phí dễ thấy nhất khi giao dịch.

## Slippage là gì?

Slippage, hay trượt giá, xảy ra khi lệnh được khớp ở giá khác với kỳ vọng. Điều này thường xuất hiện khi thị trường chạy nhanh, thanh khoản thấp hoặc có tin lớn.

## Khi nào chi phí tăng?

- Gần thời điểm công bố tin high impact.
- Lúc mở cửa thị trường hoặc rollover.
- Trên cặp tiền kém thanh khoản.
- Khi biến động tăng đột ngột.

## Cách giảm ảnh hưởng

- Tránh giao dịch vài giây trước tin lớn.
- Dùng limit order khi cần entry chính xác.
- Đặt stop loss đủ rộng so với spread bình thường.
- So sánh chi phí trung bình, không chỉ spread quảng cáo thấp nhất.

Spread và slippage là một phần của giao dịch thật. Backtest nên tính cả chi phí ước lượng.`,
    },
  ),
  lesson(
    "london-new-york-session-overlap",
    "beginner",
    {
      title: "London and New York session overlap in forex",
      summary:
        "Why liquidity and volatility often improve when London and New York are both open.",
      keywords: ["London New York overlap forex", "best forex trading sessions", "forex market hours"],
      body: `## What is the overlap?

The London-New York overlap is the period when both major financial centers are open. Many active traders watch it because volume and volatility often rise.

## Why it matters

More participants can mean tighter spreads, cleaner breakouts and more follow-through. But higher volatility can also mean faster losses.

## What moves during the overlap

- EURUSD, GBPUSD and other USD pairs.
- XAUUSD because US yields and USD are active.
- Indices and risk-sensitive assets.

## How beginners can use it

- Plan trades before the session, not in the middle of panic.
- Watch if price respects key levels.
- Avoid overtrading every candle.
- Check for US data releases inside the overlap.

The overlap is not automatically profitable. It is simply a time window with more activity.`,
    },
    {
      title: "Phiên London New York overlap trong forex",
      summary:
        "Vì sao thanh khoản và biến động thường tốt hơn khi London và New York cùng mở cửa.",
      keywords: ["phiên London New York forex", "giờ giao dịch forex tốt nhất", "forex market hours"],
      body: `## Overlap là gì?

London-New York overlap là khoảng thời gian hai trung tâm tài chính lớn cùng mở cửa. Nhiều day trader theo dõi vì khối lượng và biến động thường tăng.

## Vì sao quan trọng?

Nhiều người tham gia hơn có thể giúp spread hẹp hơn, breakout rõ hơn và giá có lực đi tiếp. Nhưng biến động cao cũng khiến thua lỗ nhanh hơn.

## Sản phẩm thường biến động

- EURUSD, GBPUSD và các cặp có USD.
- XAUUSD vì lợi suất Mỹ và USD hoạt động mạnh.
- Chỉ số và tài sản nhạy với rủi ro.

## Người mới nên dùng thế nào?

- Lên kế hoạch trước phiên, không vào lệnh khi đang hoảng.
- Quan sát giá phản ứng với vùng quan trọng.
- Tránh overtrade mọi cây nến.
- Kiểm tra tin Mỹ trong khung overlap.

Overlap không tự động tạo lợi nhuận. Nó chỉ là khung giờ thị trường hoạt động mạnh hơn.`,
    },
  ),
  lesson(
    "support-and-resistance-basics",
    "beginner",
    {
      title: "Support and resistance basics",
      summary:
        "How to mark zones, avoid exact-line thinking and combine levels with risk management.",
      keywords: ["support and resistance forex", "how to draw support resistance", "forex levels"],
      body: `## What are support and resistance?

Support is an area where buyers previously reacted. Resistance is an area where sellers previously reacted. Think zones, not perfect lines.

## How to mark levels

- Start from higher timeframes.
- Use obvious swing highs and swing lows.
- Prefer zones touched by strong reactions.
- Do not mark every small turn.

## Common mistake

Beginners often expect price to reverse exactly at a line. Real markets can wick through a level, retest it or break it completely.

## Better workflow

Mark the zone, wait for price action, then plan entry, stop loss and target. If the stop is too wide for your account risk, reduce lot size or skip the trade.

Support and resistance are context tools. They work best with a complete trading plan.`,
    },
    {
      title: "Hỗ trợ kháng cự forex cơ bản",
      summary:
        "Cách vẽ vùng giá, tránh tư duy đường kẻ tuyệt đối và kết hợp với quản lý rủi ro.",
      keywords: ["hỗ trợ kháng cự forex", "cách vẽ hỗ trợ kháng cự", "vùng giá forex"],
      body: `## Hỗ trợ và kháng cự là gì?

Hỗ trợ là vùng từng có lực mua phản ứng. Kháng cự là vùng từng có lực bán phản ứng. Hãy nghĩ theo vùng, không phải một đường hoàn hảo.

## Cách đánh dấu vùng

- Bắt đầu từ khung thời gian lớn.
- Dùng swing high và swing low rõ ràng.
- Ưu tiên vùng có phản ứng mạnh.
- Không đánh dấu mọi điểm xoay nhỏ.

## Lỗi phổ biến

Người mới thường kỳ vọng giá đảo chiều chính xác tại một đường. Thực tế giá có thể quét râu qua vùng, retest hoặc phá hẳn.

## Quy trình tốt hơn

Đánh dấu vùng, chờ price action, rồi mới lập kế hoạch entry, stop loss và target. Nếu stop quá rộng so với rủi ro tài khoản, hãy giảm lot hoặc bỏ qua.

Hỗ trợ kháng cự là công cụ bối cảnh. Nó hiệu quả hơn khi nằm trong kế hoạch giao dịch đầy đủ.`,
    },
  ),
  lesson(
    "forex-trading-journal-guide",
    "beginner",
    {
      title: "Forex trading journal guide",
      summary:
        "What to record after each trade so you can improve with evidence instead of memory.",
      keywords: ["forex trading journal", "trading journal guide", "how to journal trades"],
      body: `## Why keep a trading journal?

A journal turns vague feelings into data. Without records, it is hard to know whether a strategy is weak or discipline is the problem.

## What to record

- Symbol and timeframe.
- Entry, stop loss and take profit.
- Reason for entry.
- Risk reward planned.
- Result and screenshot.
- Emotional state and rule mistakes.

## Weekly review

Once a week, group trades by setup. Look for repeated mistakes: entering too early, ignoring news, moving stops or taking profit too soon.

## Keep it simple

A useful journal does not need to be beautiful. It needs to be honest and consistent.

Use the Social Forex Journal to record trades and separate educational review from broker account emotions.`,
    },
    {
      title: "Cách ghi nhật ký giao dịch forex",
      summary:
        "Nên ghi gì sau mỗi lệnh để cải thiện bằng dữ liệu thay vì trí nhớ.",
      keywords: ["nhật ký giao dịch forex", "cách ghi journal trading", "trading journal"],
      body: `## Vì sao cần nhật ký giao dịch?

Nhật ký biến cảm giác mơ hồ thành dữ liệu. Nếu không ghi lại, rất khó biết chiến lược yếu hay kỷ luật mới là vấn đề.

## Nên ghi gì?

- Symbol và khung thời gian.
- Entry, stop loss và take profit.
- Lý do vào lệnh.
- Risk reward dự kiến.
- Kết quả và ảnh chụp chart.
- Cảm xúc và lỗi vi phạm quy tắc.

## Review hàng tuần

Mỗi tuần, gom các lệnh theo setup. Tìm lỗi lặp lại: vào quá sớm, bỏ qua tin, dời stop hoặc chốt lời quá nhanh.

## Giữ đơn giản

Một nhật ký hữu ích không cần đẹp. Nó cần trung thực và đều đặn.

Dùng Journal của Social Forex để ghi lệnh và tách phần học tập khỏi cảm xúc trong tài khoản broker.`,
    },
  ),
  lesson(
    "cpi-inflation-forex-impact",
    "intermediate",
    {
      title: "How CPI inflation data affects forex",
      summary:
        "Why inflation reports can move currencies through interest rate expectations.",
      keywords: ["CPI forex impact", "inflation data forex", "how CPI affects USD"],
      body: `## What is CPI?

CPI stands for Consumer Price Index. It measures changes in consumer prices and is one of the most watched inflation indicators.

## Why forex cares

Central banks respond to inflation. If CPI is hotter than expected, markets may price higher interest rates. If CPI cools, rate expectations may fall.

## Typical USD reaction

- Higher-than-forecast CPI can support USD.
- Lower-than-forecast CPI can weaken USD.
- Core CPI often matters because it excludes volatile food and energy.

## Trading caution

CPI releases can cause very fast moves. Spreads can widen, and the first reaction can reverse.

## Practical use

Check CPI date, forecast and previous number. After release, compare actual with forecast and watch whether the move holds after the first few minutes.`,
    },
    {
      title: "CPI ảnh hưởng forex như thế nào?",
      summary:
        "Vì sao dữ liệu lạm phát có thể làm tiền tệ biến động qua kỳ vọng lãi suất.",
      keywords: ["CPI ảnh hưởng forex", "tin lạm phát forex", "CPI ảnh hưởng USD"],
      body: `## CPI là gì?

CPI là Consumer Price Index, chỉ số giá tiêu dùng. Đây là một trong những thước đo lạm phát được thị trường theo dõi nhiều nhất.

## Vì sao forex quan tâm?

Ngân hàng trung ương phản ứng với lạm phát. Nếu CPI cao hơn kỳ vọng, thị trường có thể định giá lãi suất cao hơn. Nếu CPI hạ nhiệt, kỳ vọng lãi suất có thể giảm.

## Phản ứng USD thường gặp

- CPI cao hơn forecast có thể hỗ trợ USD.
- CPI thấp hơn forecast có thể làm USD yếu.
- Core CPI thường quan trọng vì loại trừ thực phẩm và năng lượng biến động mạnh.

## Cẩn trọng khi giao dịch

Tin CPI có thể làm giá chạy rất nhanh. Spread có thể giãn và phản ứng đầu tiên có thể đảo chiều.

## Cách dùng thực tế

Kiểm tra ngày CPI, forecast và previous. Sau khi công bố, so sánh actual với forecast và quan sát giá có giữ hướng sau vài phút đầu hay không.`,
    },
  ),
  lesson(
    "interest-rates-and-currency-strength",
    "intermediate",
    {
      title: "Interest rates and currency strength",
      summary:
        "How central bank expectations influence currency trends and why the market cares about guidance.",
      keywords: ["interest rates forex", "currency strength interest rates", "central bank forex"],
      body: `## Why interest rates matter

Currencies are influenced by expected returns. When a central bank is expected to keep rates higher, that currency can become more attractive.

## Expectations matter more than headlines

If a rate hike is fully expected, the market may not react much. The surprise often comes from guidance: what the central bank says about the next meetings.

## What to watch

- Policy rate decision.
- Statement language.
- Press conference tone.
- Inflation and jobs projections.
- Market pricing before the event.

## Beginner takeaway

Do not treat every rate hike as automatically bullish. Compare the decision with expectations and watch whether guidance changes the future path.`,
    },
    {
      title: "Lãi suất ảnh hưởng sức mạnh tiền tệ thế nào?",
      summary:
        "Kỳ vọng ngân hàng trung ương ảnh hưởng xu hướng tiền tệ ra sao và vì sao guidance quan trọng.",
      keywords: ["lãi suất ảnh hưởng forex", "sức mạnh tiền tệ", "ngân hàng trung ương forex"],
      body: `## Vì sao lãi suất quan trọng?

Tiền tệ chịu ảnh hưởng bởi lợi suất kỳ vọng. Khi một ngân hàng trung ương được kỳ vọng giữ lãi suất cao hơn, đồng tiền đó có thể hấp dẫn hơn.

## Kỳ vọng quan trọng hơn headline

Nếu việc tăng lãi suất đã được thị trường dự đoán đầy đủ, phản ứng có thể không lớn. Bất ngờ thường nằm ở guidance: ngân hàng trung ương nói gì về các cuộc họp tiếp theo.

## Cần theo dõi gì?

- Quyết định lãi suất.
- Ngôn ngữ trong tuyên bố.
- Giọng điệu họp báo.
- Dự báo lạm phát và việc làm.
- Kỳ vọng thị trường trước sự kiện.

## Bài học cho người mới

Đừng xem mọi lần tăng lãi suất là chắc chắn bullish. Hãy so với kỳ vọng và xem guidance có thay đổi đường đi tương lai hay không.`,
    },
  ),
  lesson(
    "forex-beginner-mistakes",
    "beginner",
    {
      title: "Common forex beginner mistakes",
      summary:
        "The mistakes that hurt new traders most: oversized lots, no plan, revenge trading and ignoring costs.",
      keywords: ["forex beginner mistakes", "new trader mistakes", "forex trading mistakes"],
      body: `## Mistake 1: trading too large

Oversized lots make normal losses feel unbearable. This often leads to moving stops or revenge trading.

## Mistake 2: no written plan

If entry and exit rules are only in your head, they change under pressure. Write them down before the trade.

## Mistake 3: ignoring news

High impact news can create slippage and spread expansion. Check the calendar even if you do not trade news.

## Mistake 4: chasing signals

A signal is not a substitute for risk management. You still need to understand entry, stop loss and invalidation.

## Mistake 5: reviewing only winners

The best lessons often come from losing trades. Journal both wins and losses honestly.

The goal for beginners is survival and learning, not fast profit.`,
    },
    {
      title: "Các lỗi phổ biến của người mới giao dịch forex",
      summary:
        "Những lỗi khiến trader mới mất tiền: lot quá lớn, không có kế hoạch, revenge trading và bỏ qua chi phí.",
      keywords: ["lỗi người mới forex", "sai lầm trader mới", "lỗi giao dịch forex"],
      body: `## Lỗi 1: vào lot quá lớn

Lot quá lớn khiến một khoản lỗ bình thường trở nên khó chịu. Điều này thường dẫn đến dời stop hoặc gỡ lệnh.

## Lỗi 2: không có kế hoạch viết ra

Nếu quy tắc entry và exit chỉ nằm trong đầu, chúng dễ thay đổi khi áp lực tăng. Hãy viết trước khi vào lệnh.

## Lỗi 3: bỏ qua tin tức

Tin high impact có thể gây trượt giá và giãn spread. Hãy kiểm tra lịch dù bạn không trade news.

## Lỗi 4: chạy theo tín hiệu

Tín hiệu không thay thế quản lý rủi ro. Bạn vẫn cần hiểu entry, stop loss và điểm vô hiệu setup.

## Lỗi 5: chỉ review lệnh thắng

Bài học tốt thường đến từ lệnh thua. Hãy ghi nhật ký cả thắng lẫn thua một cách trung thực.

Mục tiêu của người mới là sống sót và học, không phải lợi nhuận nhanh.`,
    },
  ),
  lesson(
    "forex-demo-account-practice",
    "beginner",
    {
      title: "How to practice with a forex demo account",
      summary:
        "Use demo trading to learn platform mechanics, risk and journaling without real-money pressure.",
      keywords: ["forex demo account practice", "how to use demo trading", "MT5 demo forex"],
      body: `## What demo is good for

A demo account lets you learn order types, platform controls and basic execution without risking real money.

## What demo is not good for

Demo does not fully recreate the emotions of live trading. It can make oversized risk feel harmless.

## Practice routine

- Use the same risk percentage you would use live.
- Place stop loss and take profit every time.
- Record trades in a journal.
- Test one strategy at a time.
- Review after 20-30 trades.

## When to move slowly

If you cannot follow rules on demo, live trading will not fix it. Treat demo as training, not a game.

Use Social Forex Start and Academy to combine platform practice with risk education.`,
    },
    {
      title: "Cách luyện tập với tài khoản demo forex",
      summary:
        "Dùng demo để học thao tác nền tảng, rủi ro và nhật ký mà không chịu áp lực tiền thật.",
      keywords: ["tài khoản demo forex", "cách dùng demo trading", "MT5 demo forex"],
      body: `## Demo tốt cho việc gì?

Tài khoản demo giúp bạn học loại lệnh, thao tác nền tảng và khớp lệnh cơ bản mà không rủi ro tiền thật.

## Demo không tốt cho việc gì?

Demo không tái tạo đầy đủ cảm xúc khi giao dịch live. Nó có thể khiến rủi ro lớn trông vô hại.

## Quy trình luyện tập

- Dùng cùng phần trăm rủi ro như khi giao dịch thật.
- Luôn đặt stop loss và take profit.
- Ghi lệnh vào nhật ký.
- Chỉ test một chiến lược mỗi lần.
- Review sau 20-30 lệnh.

## Khi nào nên đi chậm?

Nếu bạn chưa theo được quy tắc trên demo, live trading sẽ không tự sửa điều đó. Hãy xem demo là huấn luyện, không phải trò chơi.

Dùng Start và Academy của Social Forex để kết hợp thực hành nền tảng với học quản lý rủi ro.`,
    },
  ),
  lesson(
    "mt5-order-types-beginner",
    "beginner",
    {
      title: "MT5 order types for beginners",
      summary:
        "Market, limit, stop, stop loss and take profit explained in simple trading language.",
      keywords: ["MT5 order types", "market limit stop order", "MetaTrader 5 beginner"],
      body: `## Market order

A market order enters immediately at the best available price. It is simple but can suffer slippage in fast markets.

## Limit order

A limit order asks to buy lower or sell higher than current price. It is useful when you want a better price and can wait.

## Stop order

A stop order becomes active after price reaches a trigger level. Traders often use it for breakout entries.

## Stop loss and take profit

Stop loss exits when the trade goes against you. Take profit exits when price reaches your planned target.

## Beginner rule

Before pressing buy or sell, know the order type, stop loss, target and position size. Platform skill is part of risk management.`,
    },
    {
      title: "Các loại lệnh MT5 cho người mới",
      summary:
        "Giải thích market, limit, stop, stop loss và take profit bằng ngôn ngữ đơn giản.",
      keywords: ["các loại lệnh MT5", "lệnh market limit stop", "MetaTrader 5 cho người mới"],
      body: `## Market order

Market order vào lệnh ngay ở giá tốt nhất hiện có. Lệnh này đơn giản nhưng có thể trượt giá khi thị trường chạy nhanh.

## Limit order

Limit order dùng để mua thấp hơn hoặc bán cao hơn giá hiện tại. Nó hữu ích khi bạn muốn giá tốt hơn và có thể chờ.

## Stop order

Stop order chỉ kích hoạt sau khi giá chạm mức trigger. Trader thường dùng cho entry breakout.

## Stop loss và take profit

Stop loss thoát lệnh khi giá đi ngược. Take profit thoát lệnh khi giá tới mục tiêu đã lập kế hoạch.

## Quy tắc cho người mới

Trước khi bấm buy hoặc sell, hãy biết loại lệnh, stop loss, target và khối lượng. Kỹ năng dùng nền tảng là một phần của quản lý rủi ro.`,
    },
  ),
  lesson(
    "forex-trend-analysis",
    "beginner",
    {
      title: "Forex trend analysis for beginners",
      summary:
        "Learn higher highs, lower lows, moving averages and when trend labels become unclear.",
      keywords: ["forex trend analysis", "how to identify trend forex", "higher highs lower lows"],
      body: `## What is a trend?

An uptrend often forms higher highs and higher lows. A downtrend forms lower highs and lower lows.

## Use market structure first

Before adding indicators, mark swing points. If price keeps breaking previous highs, buyers may be in control.

## Moving averages

Moving averages can help visualize direction. Price above a rising average suggests upward bias, but it is not a signal by itself.

## Ranges are common

Not every market is trending. If highs and lows overlap, the market may be ranging. Trend strategies can struggle in ranges.

## Practical checklist

- Start from higher timeframe.
- Mark structure.
- Identify key support and resistance.
- Avoid forcing a trend label when price is messy.

Trend analysis is context. Entry and risk still need separate rules.`,
    },
    {
      title: "Phân tích xu hướng forex cho người mới",
      summary:
        "Học higher high, lower low, moving average và khi nào xu hướng trở nên không rõ.",
      keywords: ["phân tích xu hướng forex", "cách xác định xu hướng forex", "higher high lower low"],
      body: `## Xu hướng là gì?

Xu hướng tăng thường tạo đỉnh cao hơn và đáy cao hơn. Xu hướng giảm tạo đỉnh thấp hơn và đáy thấp hơn.

## Dùng cấu trúc thị trường trước

Trước khi thêm indicator, hãy đánh dấu các swing point. Nếu giá liên tục phá đỉnh cũ, bên mua có thể đang kiểm soát.

## Moving average

Moving average giúp nhìn hướng đi dễ hơn. Giá nằm trên MA đang dốc lên gợi ý thiên hướng tăng, nhưng bản thân nó chưa phải tín hiệu vào lệnh.

## Range rất phổ biến

Không phải lúc nào thị trường cũng có trend. Nếu đỉnh đáy chồng lấn, thị trường có thể đang đi ngang. Chiến lược trend thường khó hoạt động trong range.

## Checklist thực tế

- Bắt đầu từ khung thời gian lớn.
- Đánh dấu cấu trúc.
- Xác định hỗ trợ kháng cự chính.
- Tránh ép nhãn xu hướng khi chart quá nhiễu.

Phân tích xu hướng là bối cảnh. Entry và rủi ro vẫn cần quy tắc riêng.`,
    },
  ),
  lesson(
    "candlestick-patterns-forex",
    "beginner",
    {
      title: "Candlestick patterns in forex",
      summary:
        "Pin bar, engulfing and inside bar explained with context-first thinking.",
      keywords: ["candlestick patterns forex", "pin bar engulfing inside bar", "price action forex"],
      body: `## Candles show behavior

Candlestick patterns summarize buying and selling pressure. They are more useful at important zones than in the middle of random price action.

## Pin bar

A pin bar has a long wick and small body. It can show rejection, especially near support or resistance.

## Engulfing candle

An engulfing candle covers the previous candle body. It can show a shift in pressure, but context matters.

## Inside bar

An inside bar sits within the range of the previous candle. It can show compression before a breakout.

## Do not trade patterns alone

Ask: where did the pattern appear, what is the trend, where is invalidation, and does the risk reward make sense?`,
    },
    {
      title: "Mô hình nến forex cơ bản",
      summary:
        "Pin bar, engulfing và inside bar theo tư duy đặt bối cảnh lên trước.",
      keywords: ["mô hình nến forex", "pin bar engulfing inside bar", "price action forex"],
      body: `## Nến thể hiện hành vi

Mô hình nến tóm tắt áp lực mua bán. Chúng hữu ích hơn khi xuất hiện tại vùng quan trọng, không phải giữa đoạn giá ngẫu nhiên.

## Pin bar

Pin bar có bóng nến dài và thân nhỏ. Nó có thể cho thấy sự từ chối giá, đặc biệt gần hỗ trợ hoặc kháng cự.

## Engulfing candle

Nến engulfing bao phủ thân nến trước. Nó có thể thể hiện sự dịch chuyển áp lực, nhưng bối cảnh rất quan trọng.

## Inside bar

Inside bar nằm trong phạm vi của cây nến trước. Nó có thể cho thấy sự nén giá trước breakout.

## Đừng giao dịch mô hình nến đơn lẻ

Hãy hỏi: mô hình xuất hiện ở đâu, xu hướng là gì, điểm vô hiệu ở đâu và risk reward có hợp lý không?`,
    },
  ),
  lesson(
    "breakout-vs-fakeout",
    "intermediate",
    {
      title: "Breakout vs fakeout in forex",
      summary:
        "How to think about breakouts, failed breaks, retests and risk control.",
      keywords: ["breakout vs fakeout forex", "forex breakout strategy", "false breakout"],
      body: `## What is a breakout?

A breakout happens when price moves beyond a support, resistance or range boundary. Traders watch it because it may start a new directional move.

## What is a fakeout?

A fakeout happens when price breaks a level but quickly returns back inside. It often traps traders who entered too late or used tight stops.

## Confirmation ideas

- Wait for candle close beyond the level.
- Watch volume or volatility if available.
- Look for a retest of the broken zone.
- Avoid trading into nearby higher timeframe resistance.

## Risk control

Breakouts can move fast. Decide where the breakout idea is invalid before entering. If the stop is too wide, skip the trade.

No confirmation removes risk. It only helps define a clearer plan.`,
    },
    {
      title: "Breakout và fakeout trong forex",
      summary:
        "Cách hiểu breakout, phá vỡ thất bại, retest và kiểm soát rủi ro.",
      keywords: ["breakout fakeout forex", "chiến lược breakout forex", "false breakout"],
      body: `## Breakout là gì?

Breakout xảy ra khi giá vượt khỏi hỗ trợ, kháng cự hoặc biên của vùng đi ngang. Trader theo dõi vì nó có thể mở đầu một nhịp đi có hướng.

## Fakeout là gì?

Fakeout xảy ra khi giá phá qua một mức rồi nhanh chóng quay lại bên trong. Nó thường bẫy trader vào muộn hoặc đặt stop quá sát.

## Ý tưởng xác nhận

- Chờ nến đóng ngoài vùng.
- Quan sát volume hoặc biến động nếu có.
- Chờ retest vùng vừa phá.
- Tránh mua thẳng vào kháng cự lớn ở khung cao.

## Kiểm soát rủi ro

Breakout có thể chạy rất nhanh. Hãy xác định điểm setup sai trước khi vào lệnh. Nếu stop quá rộng, bỏ qua.

Không xác nhận nào loại bỏ rủi ro. Nó chỉ giúp kế hoạch rõ hơn.`,
    },
  ),
  lesson(
    "forex-news-trading-risks",
    "intermediate",
    {
      title: "Forex news trading risks",
      summary:
        "Why news trading can be difficult: spread widening, slippage, whipsaws and emotional decisions.",
      keywords: ["forex news trading risks", "trade news forex", "high impact news forex"],
      body: `## News creates uncertainty

Major economic releases can change expectations quickly. The first move is not always the final direction.

## Main risks

- Spread widening before and after release.
- Slippage on market and stop orders.
- Whipsaws in both directions.
- Emotional decisions after a fast candle.

## Safer alternatives

Beginners can choose to avoid new entries around high impact news. Another approach is waiting until the first reaction settles and trading only if a clean setup appears.

## Use the calendar

Check event time, currency, forecast and impact. If you hold a trade through news, know the risk before the release.

News trading is advanced. Avoid treating one data point as a guaranteed direction.`,
    },
    {
      title: "Rủi ro khi giao dịch theo tin forex",
      summary:
        "Vì sao trade news khó: spread giãn, trượt giá, giật hai đầu và quyết định cảm xúc.",
      keywords: ["rủi ro trade news forex", "giao dịch theo tin forex", "tin high impact forex"],
      body: `## Tin tức tạo bất định

Các dữ liệu kinh tế lớn có thể thay đổi kỳ vọng rất nhanh. Nhịp đầu tiên không phải lúc nào cũng là hướng cuối cùng.

## Rủi ro chính

- Spread giãn trước và sau tin.
- Trượt giá với market order và stop order.
- Giá giật hai đầu.
- Quyết định cảm xúc sau một cây nến nhanh.

## Lựa chọn an toàn hơn

Người mới có thể tránh mở lệnh quanh tin high impact. Một cách khác là chờ phản ứng đầu tiên ổn định rồi chỉ giao dịch nếu có setup rõ.

## Dùng lịch kinh tế

Kiểm tra thời gian, đồng tiền, forecast và mức ảnh hưởng. Nếu giữ lệnh qua tin, hãy biết rủi ro trước khi tin ra.

Trade news là kỹ năng nâng cao. Đừng xem một số liệu là hướng đi chắc chắn.`,
    },
  ),
  lesson(
    "forex-position-sizing-1-percent-rule",
    "beginner",
    {
      title: "The 1 percent rule in forex position sizing",
      summary:
        "Why many beginners cap risk per trade and how small risk helps survive losing streaks.",
      keywords: ["1 percent rule forex", "forex position sizing", "risk per trade forex"],
      body: `## What is the 1 percent rule?

The 1 percent rule means risking no more than 1% of your account on a single trade. It is a beginner-friendly risk framework, not a law.

## Why it helps

Small risk makes losing streaks survivable. Ten losses at 1% each hurt, but they do not usually destroy the account.

## How to apply it

- Calculate 1% of account balance.
- Place stop loss based on the chart.
- Calculate lot size from the stop distance.
- Keep the same rule during wins and losses.

## Common mistake

Risking 1% does not mean using 1% margin. It means the expected loss at stop loss equals 1% of the account.

The rule is simple, but following it under emotion is the real skill.`,
    },
    {
      title: "Quy tắc 1% trong tính lot forex",
      summary:
        "Vì sao nhiều người mới giới hạn rủi ro mỗi lệnh và cách rủi ro nhỏ giúp sống sót qua chuỗi thua.",
      keywords: ["quy tắc 1% forex", "tính lot forex", "rủi ro mỗi lệnh forex"],
      body: `## Quy tắc 1% là gì?

Quy tắc 1% nghĩa là không rủi ro quá 1% tài khoản cho một lệnh. Đây là khung quản lý rủi ro thân thiện với người mới, không phải luật bắt buộc.

## Vì sao hữu ích?

Rủi ro nhỏ giúp bạn sống sót qua chuỗi thua. 10 lệnh thua liên tiếp với 1% mỗi lệnh gây khó chịu, nhưng thường không phá hủy tài khoản.

## Cách áp dụng

- Tính 1% số dư tài khoản.
- Đặt stop loss dựa trên chart.
- Tính lot từ khoảng cách stop.
- Giữ cùng quy tắc khi thắng và khi thua.

## Lỗi phổ biến

Rủi ro 1% không có nghĩa là dùng 1% margin. Nó nghĩa là khoản lỗ dự kiến khi chạm stop bằng 1% tài khoản.

Quy tắc đơn giản, nhưng làm đúng khi có cảm xúc mới là kỹ năng thật.`,
    },
  ),
  lesson(
    "price-action-pin-bar",
    "intermediate",
    {
      title: "Price action: how to trade pin bars",
      summary:
        "Identify bullish and bearish pin bars, understand what the long wick tells you, and learn how to set entry, stop loss, and target.",
      keywords: ["pin bar forex", "price action pin bar", "hammer candlestick forex", "shooting star forex"],
      body: `## What is a pin bar?

A pin bar (short for Pinocchio bar) is a single candle with a very long wick and a small body. The long wick shows that price moved strongly in one direction but was rejected — buyers or sellers pushed back hard enough to close price near the open.

## Bullish pin bar at support

A bullish pin bar forms when price dips into a support zone, is rejected, and closes back near the top of the candle. The long lower wick is the rejection signal.

[diagram:pin-bar-bullish]

What to look for: small body sitting near the top of the candle, long lower wick penetrating a support zone, and a downtrend or pullback leading into it. The longer the wick relative to nearby candles, the stronger the signal.

## Bearish pin bar at resistance

A bearish pin bar forms when price spikes into a resistance zone and gets rejected. The long upper wick shows sellers took control.

[diagram:pin-bar-bearish]

What to look for: small body near the bottom of the candle, long upper wick spiking into a resistance zone, and an uptrend or rally leading into it.

## How to trade a pin bar

1. Identify a key support or resistance zone on H4 or Daily timeframe.
2. Wait for price to approach the zone and form a pin bar with a clear long wick.
3. Enter on the open of the next candle after the pin bar closes.
4. Stop loss goes just beyond the tip of the wick — outside the zone.
5. Target the next structural level for take profit.

## What makes a pin bar stronger

- Forms at a clearly defined support or resistance zone
- H4 or Daily timeframe (longer timeframes produce more reliable signals)
- Long wick is at least twice the body length
- The body closes inside the previous candle range
- Aligns with the higher timeframe trend direction

## Common mistakes

Trading every pin bar you find is the fastest way to lose money. A pin bar in the middle of a range, against the higher timeframe trend, or with a short wick relative to nearby candles carries much lower probability. Always ask: where did the pin bar form, not just what it looks like.`,
    },
    {
      title: "Price action: cách giao dịch pin bar",
      summary:
        "Nhận diện pin bar tăng và giảm, hiểu bóng nến dài nói gì, và học cách đặt entry, stop loss, target.",
      keywords: ["pin bar forex", "price action pin bar", "nến hammer forex", "shooting star forex"],
      body: `## Pin bar là gì?

Pin bar (viết tắt của Pinocchio bar) là một cây nến đơn có bóng rất dài và thân nhỏ. Bóng nến dài cho thấy giá đã di chuyển mạnh theo một hướng nhưng bị từ chối — bên mua hoặc bên bán đã phản ứng đủ mạnh để đẩy giá quay về gần điểm mở cửa.

## Pin bar tăng tại vùng hỗ trợ

Pin bar tăng hình thành khi giá lao vào vùng hỗ trợ, bị từ chối, và đóng cửa gần đỉnh cây nến. Bóng dưới dài là tín hiệu từ chối.

[diagram:pin-bar-bullish]

Cần tìm: thân nhỏ nằm gần đỉnh cây nến, bóng dưới dài đâm vào vùng hỗ trợ, và bối cảnh giảm giá hoặc pullback trước đó. Bóng càng dài so với các nến gần đó, tín hiệu càng mạnh.

## Pin bar giảm tại vùng kháng cự

Pin bar giảm hình thành khi giá đâm lên vùng kháng cự rồi bị đẩy xuống. Bóng trên dài cho thấy bên bán đang kiểm soát.

[diagram:pin-bar-bearish]

Cần tìm: thân nhỏ gần đáy cây nến, bóng trên dài đâm vào vùng kháng cự, và xu hướng tăng hoặc đà tăng trước đó.

## Cách giao dịch pin bar

1. Xác định vùng hỗ trợ hoặc kháng cự rõ ràng trên khung H4 hoặc Daily.
2. Chờ giá tiếp cận vùng đó và hình thành pin bar với bóng nến dài rõ ràng.
3. Vào lệnh tại open của nến tiếp theo sau khi pin bar đóng cửa.
4. Stop loss đặt ngay sau đầu bóng nến — ngoài vùng.
5. Take profit tại mức cấu trúc tiếp theo.

## Điều gì làm pin bar mạnh hơn

- Xuất hiện tại vùng hỗ trợ kháng cự được xác định rõ
- Khung H4 hoặc Daily (khung lớn cho tín hiệu đáng tin hơn)
- Bóng nến dài ít nhất gấp đôi thân nến
- Thân nến đóng trong phạm vi nến trước
- Cùng chiều xu hướng khung lớn

## Lỗi phổ biến

Giao dịch mọi pin bar là cách nhanh nhất để thua lỗ. Pin bar giữa vùng đi ngang, ngược chiều xu hướng khung lớn, hoặc bóng ngắn so với các nến gần đó đều có xác suất thấp. Luôn hỏi: pin bar xuất hiện ở đâu, không chỉ trông như thế nào.`,
    },
  ),
  lesson(
    "price-action-engulfing",
    "intermediate",
    {
      title: "Price action: engulfing candle setups",
      summary:
        "How to read bullish and bearish engulfing patterns, what makes an engulfing signal strong, and how to trade them at key levels.",
      keywords: ["engulfing candle forex", "bullish engulfing", "bearish engulfing", "price action reversal"],
      body: `## What is an engulfing candle?

An engulfing pattern is two candles where the second candle's body completely covers the first candle's body. It signals a shift in momentum — the second candle shows that the opposing side took over completely.

## Bullish engulfing

A bullish engulfing forms when a small bearish candle is followed by a larger bullish candle that opens below the first close and closes above the first open.

[diagram:engulfing-bullish]

Context matters: a bullish engulfing at a support zone after a downtrend or pullback is far more meaningful than one appearing randomly. The green candle should visibly dominate the red one.

## Bearish engulfing

A bearish engulfing forms when a small bullish candle is followed by a larger bearish candle that opens above the first close and closes below the first open.

[diagram:engulfing-bearish]

Look for bearish engulfing at resistance zones after an uptrend or rally. The red candle should be clearly larger than the green one it covers.

## What makes an engulfing pattern stronger

- The second candle is significantly larger than the first — not just marginally bigger
- Forms at a key support or resistance zone, not in empty space
- The second candle closes well beyond the first candle's body (not just touching)
- Higher timeframe context supports the direction (H4 or Daily)
- Previous candles show exhaustion — small bodies, long wicks, or slowing momentum

## How to trade engulfing setups

1. Mark key support and resistance on H4 or Daily.
2. Wait for a clear engulfing candle to form at one of those levels.
3. Enter on the next candle open after the engulfing closes.
4. Stop loss goes below the low of the engulfing pattern (for bullish) or above the high (for bearish).
5. Target the next structural level.

## Common mistakes

The most common mistake is trading engulfing patterns away from key levels. Two candles where the second is slightly bigger than the first, appearing mid-range, is not a reliable signal. Size and location both matter.`,
    },
    {
      title: "Price action: setup nến engulfing",
      summary:
        "Cách đọc mô hình engulfing tăng và giảm, điều gì làm tín hiệu engulfing mạnh, và cách giao dịch tại vùng giá quan trọng.",
      keywords: ["nến engulfing forex", "bullish engulfing", "bearish engulfing", "price action đảo chiều"],
      body: `## Nến engulfing là gì?

Mô hình engulfing gồm hai nến trong đó thân nến thứ hai bao phủ hoàn toàn thân nến thứ nhất. Nó báo hiệu sự thay đổi động lực — nến thứ hai cho thấy bên đối lập đã kiểm soát hoàn toàn.

## Bullish engulfing (tăng)

Bullish engulfing hình thành khi một cây nến đỏ nhỏ được tiếp nối bởi cây nến xanh lớn hơn, mở dưới điểm đóng của nến đỏ và đóng trên điểm mở của nến đỏ.

[diagram:engulfing-bullish]

Bối cảnh quan trọng: bullish engulfing tại vùng hỗ trợ sau xu hướng giảm hoặc pullback có ý nghĩa hơn nhiều so với khi xuất hiện ngẫu nhiên. Cây nến xanh cần áp đảo cây nến đỏ một cách rõ ràng.

## Bearish engulfing (giảm)

Bearish engulfing hình thành khi một cây nến xanh nhỏ được tiếp nối bởi cây nến đỏ lớn hơn, mở trên điểm đóng của nến xanh và đóng dưới điểm mở của nến xanh.

[diagram:engulfing-bearish]

Tìm bearish engulfing tại vùng kháng cự sau xu hướng tăng. Cây nến đỏ cần rõ ràng lớn hơn cây nến xanh mà nó bao phủ.

## Điều gì làm engulfing mạnh hơn

- Nến thứ hai lớn hơn đáng kể so với nến thứ nhất — không chỉ nhỉnh hơn một chút
- Xuất hiện tại vùng hỗ trợ kháng cự quan trọng, không phải giữa vùng trống
- Nến thứ hai đóng cửa vượt xa thân nến đầu tiên
- Bối cảnh khung cao hơn (H4 hoặc Daily) ủng hộ chiều hướng
- Các nến trước cho thấy đà yếu dần — thân nhỏ, bóng dài, hoặc đà chậm lại

## Cách giao dịch setup engulfing

1. Đánh dấu hỗ trợ kháng cự quan trọng trên H4 hoặc Daily.
2. Chờ nến engulfing rõ ràng hình thành tại một trong các vùng đó.
3. Vào lệnh tại open nến tiếp theo sau khi engulfing đóng cửa.
4. Stop loss dưới đáy mô hình engulfing (tăng) hoặc trên đỉnh (giảm).
5. Take profit tại mức cấu trúc tiếp theo.

## Lỗi phổ biến

Lỗi phổ biến nhất là giao dịch engulfing xa vùng giá quan trọng. Hai nến mà nến sau chỉ nhỉnh hơn nến trước một chút, xuất hiện giữa vùng đi ngang, không phải tín hiệu đáng tin. Kích thước và vị trí đều quan trọng.`,
    },
  ),
  lesson(
    "price-action-inside-bar",
    "intermediate",
    {
      title: "Price action: inside bar and breakout",
      summary:
        "What an inside bar signals about market compression, how to identify the mother bar, and how to trade breakouts with defined risk.",
      keywords: ["inside bar forex", "inside bar breakout", "price action inside bar", "mother bar trading"],
      body: `## What is an inside bar?

An inside bar is a candle whose entire range — from wick high to wick low — sits completely inside the previous candle (called the mother bar). The inside bar shows compression: neither buyers nor sellers could push beyond the previous candle's range.

[diagram:inside-bar-setup]

The mother bar sets the range. The inside bar is contained within it. When price is compressed inside a range, energy builds for a breakout.

## Why inside bars form

Inside bars typically appear after a strong directional move (the mother bar), during pauses in trend, or near major support and resistance levels. The market is waiting — participants are deciding whether to continue or reverse.

## Trading the breakout

The inside bar setup is based on the breakout of the mother bar's range.

[diagram:inside-bar-breakout]

Entry: place a buy stop just above the mother bar high (for bullish breakout) or a sell stop below the mother bar low (for bearish breakout). When price breaks out, your order triggers automatically.

Stop loss: place it on the opposite side of the mother bar. If you buy the breakout above the high, your stop goes below the mother bar low. This keeps risk defined by the full setup range.

Target: measure the mother bar's height and project it from the breakout point. Alternatively, use the next structural level.

## What makes an inside bar setup stronger

- The mother bar is large and decisive — a strong directional move
- The inside bar is small, showing clear compression
- Forms at or near a key support, resistance, or trend continuation point
- Higher timeframe trend aligns with the intended breakout direction

## Failed breakouts

Not every inside bar breakout follows through. Price can break above the mother bar high and reverse quickly — this is called a failed breakout or fakeout. To reduce this risk:

- Wait for the breakout candle to close beyond the mother bar high or low
- Avoid inside bars forming against strong higher timeframe resistance
- Do not chase price if the breakout candle is very large`,
    },
    {
      title: "Price action: inside bar và breakout",
      summary:
        "Inside bar báo hiệu gì về sự nén giá, cách nhận diện mother bar, và cách giao dịch breakout với rủi ro xác định.",
      keywords: ["inside bar forex", "inside bar breakout", "price action inside bar", "mother bar giao dịch"],
      body: `## Inside bar là gì?

Inside bar là cây nến có toàn bộ biên độ — từ đỉnh bóng đến đáy bóng — nằm hoàn toàn bên trong cây nến trước (gọi là mother bar). Inside bar thể hiện sự nén giá: cả bên mua lẫn bên bán đều không thể đẩy giá ra ngoài biên độ của nến trước.

[diagram:inside-bar-setup]

Mother bar xác lập biên độ. Inside bar nằm bên trong. Khi giá bị nén trong một vùng, năng lượng tích tụ cho một cú breakout.

## Vì sao inside bar xuất hiện

Inside bar thường xuất hiện sau một nhịp đi có hướng mạnh (mother bar), trong lúc tạm dừng xu hướng, hoặc gần vùng hỗ trợ kháng cự quan trọng. Thị trường đang chờ — các bên đang quyết định tiếp tục hay đảo chiều.

## Giao dịch breakout

Setup inside bar dựa trên việc giá phá ra khỏi biên độ của mother bar.

[diagram:inside-bar-breakout]

Entry: đặt buy stop ngay trên đỉnh mother bar (breakout tăng) hoặc sell stop dưới đáy mother bar (breakout giảm). Khi giá phá ra, lệnh của bạn sẽ tự động kích hoạt.

Stop loss: đặt ở phía đối diện của mother bar. Nếu mua breakout trên đỉnh, stop đặt dưới đáy mother bar. Điều này giữ rủi ro được xác định bởi biên độ toàn bộ setup.

Take profit: đo chiều cao mother bar và chiếu từ điểm breakout. Hoặc dùng mức cấu trúc tiếp theo.

## Điều gì làm setup inside bar mạnh hơn

- Mother bar lớn và dứt khoát — một nhịp đi có hướng mạnh
- Inside bar nhỏ, thể hiện sự nén rõ ràng
- Xuất hiện tại hoặc gần vùng hỗ trợ, kháng cự quan trọng hoặc điểm tiếp diễn xu hướng
- Xu hướng khung cao hơn phù hợp với chiều breakout dự định

## Breakout thất bại

Không phải mọi breakout inside bar đều tiếp diễn. Giá có thể phá trên đỉnh mother bar rồi đảo chiều nhanh — đây gọi là failed breakout hay fakeout. Để giảm rủi ro này:

- Chờ nến breakout đóng cửa ngoài đỉnh hoặc đáy mother bar
- Tránh inside bar xuất hiện ngược chiều kháng cự khung lớn mạnh
- Đừng đuổi giá nếu nến breakout quá lớn`,
    },
  ),
  lesson(
    "price-action-bos-choch-fvg",
    "advanced",
    {
      title: "Market structure: BOS, CHoCH and Fair Value Gaps",
      summary:
        "How to read market structure using Break of Structure, Change of Character, and Fair Value Gaps to identify trend continuation and reversal setups.",
      keywords: ["BOS forex", "CHoCH forex", "fair value gap", "market structure SMC", "smart money concepts"],
      body: `## Reading market structure

Price does not move randomly. In an uptrend, price creates Higher Highs (HH) and Higher Lows (HL). In a downtrend, it creates Lower Highs (LH) and Lower Lows (LL). Understanding this structure is the foundation of price action and Smart Money Concepts (SMC).

## Break of Structure (BOS)

A BOS happens when price breaks beyond the previous swing high or low in the direction of the current trend. It confirms the trend is continuing.

[diagram:bos-uptrend]

In an uptrend: price makes HL1, then rallies. When it breaks above the previous HH, that is a BOS. This confirms buyers are still in control and the uptrend continues. BOS entries look for pullbacks after the BOS to trade continuation.

## Change of Character (CHoCH)

A CHoCH happens when price breaks the structure in the opposite direction — suggesting the trend may be reversing.

[diagram:choch-bearish]

In an uptrend: after making HH2, price pulls back to HL2. If the next move breaks below HL2 (makes a new lower low), the market structure has shifted. This is a CHoCH — a warning that sellers may be taking over. It does not guarantee reversal, but it changes the bias from bullish to neutral or bearish.

**BOS vs CHoCH in one sentence:** BOS = trend continues, CHoCH = trend may be ending.

## Fair Value Gap (FVG)

A Fair Value Gap is an imbalance in price created by a strong impulse move. It appears as a three-candle sequence where the middle candle moves so aggressively that it leaves a gap between candle one's high and candle three's low.

[diagram:fvg-bullish]

The shaded zone between C1 high and C3 low is the FVG. Price often returns to fill this gap because market participants who missed the original move look to enter at those prices.

## How to use these concepts together

A common SMC-style approach:
1. Identify the trend using HH/HL or LH/LL structure.
2. Wait for a CHoCH to signal a possible shift.
3. Look for an FVG left by the impulse that caused the CHoCH.
4. Enter when price returns to fill the FVG, with stop beyond the swing that created it.

## Important cautions

These concepts improve context but do not guarantee outcomes. Not every CHoCH leads to a reversal. Not every FVG gets filled. Use them as one layer of analysis alongside support and resistance, risk management, and session timing.`,
    },
    {
      title: "Cấu trúc thị trường: BOS, CHoCH và Fair Value Gap",
      summary:
        "Cách đọc cấu trúc thị trường bằng Break of Structure, Change of Character và Fair Value Gap để xác định setup tiếp diễn và đảo chiều.",
      keywords: ["BOS forex", "CHoCH forex", "fair value gap", "cấu trúc thị trường SMC", "smart money concepts"],
      body: `## Đọc cấu trúc thị trường

Giá không di chuyển ngẫu nhiên. Trong xu hướng tăng, giá tạo ra Đỉnh Cao Hơn (HH) và Đáy Cao Hơn (HL). Trong xu hướng giảm, giá tạo ra Đỉnh Thấp Hơn (LH) và Đáy Thấp Hơn (LL). Hiểu cấu trúc này là nền tảng của price action và Smart Money Concepts (SMC).

## Break of Structure (BOS)

BOS xảy ra khi giá phá vỡ swing high hoặc swing low trước đó theo chiều xu hướng hiện tại. Nó xác nhận xu hướng đang tiếp diễn.

[diagram:bos-uptrend]

Trong xu hướng tăng: giá tạo HL1, sau đó tăng. Khi giá phá trên HH trước, đó là BOS. Điều này xác nhận bên mua vẫn kiểm soát và xu hướng tăng tiếp tục. Entry BOS thường tìm pullback sau BOS để giao dịch tiếp diễn.

## Change of Character (CHoCH)

CHoCH xảy ra khi giá phá vỡ cấu trúc theo chiều ngược lại — gợi ý xu hướng có thể đang đảo chiều.

[diagram:choch-bearish]

Trong xu hướng tăng: sau khi tạo HH2, giá pullback xuống HL2. Nếu nhịp tiếp theo phá dưới HL2 (tạo đáy thấp hơn mới), cấu trúc thị trường đã dịch chuyển. Đây là CHoCH — cảnh báo rằng bên bán có thể đang kiểm soát. Nó không đảm bảo đảo chiều, nhưng thay đổi thiên hướng từ tăng sang trung lập hoặc giảm.

**BOS vs CHoCH trong một câu:** BOS = xu hướng tiếp diễn, CHoCH = xu hướng có thể kết thúc.

## Fair Value Gap (FVG)

Fair Value Gap là sự mất cân bằng giá được tạo ra bởi một nhịp impulse mạnh. Nó xuất hiện như một chuỗi ba nến trong đó nến giữa di chuyển mạnh đến mức để lại khoảng trống giữa đỉnh của nến thứ nhất và đáy của nến thứ ba.

[diagram:fvg-bullish]

Vùng tô màu giữa đỉnh C1 và đáy C3 là FVG. Giá thường quay lại để lấp đầy khoảng trống này vì các tham gia thị trường đã bỏ lỡ nhịp gốc muốn vào lệnh ở các mức đó.

## Cách kết hợp các khái niệm này

Một cách tiếp cận theo phong cách SMC phổ biến:
1. Xác định xu hướng bằng cấu trúc HH/HL hoặc LH/LL.
2. Chờ CHoCH báo hiệu sự dịch chuyển có thể.
3. Tìm FVG được tạo ra bởi nhịp impulse gây ra CHoCH.
4. Vào lệnh khi giá quay lại lấp FVG, stop ngoài swing đã tạo ra nó.

## Lưu ý quan trọng

Các khái niệm này cải thiện bối cảnh nhưng không đảm bảo kết quả. Không phải mọi CHoCH đều dẫn đến đảo chiều. Không phải mọi FVG đều được lấp đầy. Dùng chúng như một lớp phân tích cùng với hỗ trợ kháng cự, quản lý rủi ro và thời gian giao dịch theo phiên.`,
    },
  ),
];

function normalizeLocale(locale: string): AcademyLocale {
  return locale === "vi" ? "vi" : "en";
}

export function getAcademyLessons(locale: string): Lesson[] {
  const key = normalizeLocale(locale);
  return localizedLessons.map((item) => ({
    slug: item.slug,
    level: item.level,
    ...item[key],
  }));
}

export function getAcademyLesson(slug: string, locale: string): Lesson | undefined {
  return getAcademyLessons(locale).find((lesson) => lesson.slug === slug);
}

/**
 * Find academy lessons related to a given lesson by keyword overlap.
 * Returns up to `limit` lessons, excluding the current one.
 */
export function getRelatedLessons(
  currentSlug: string,
  locale: string,
  limit = 3,
): Lesson[] {
  const lessons = getAcademyLessons(locale);
  const current = lessons.find((l) => l.slug === currentSlug);
  if (!current) return [];

  const currentKeywords = new Set(current.keywords.map((k) => k.toLowerCase()));

  const scored = lessons
    .filter((l) => l.slug !== currentSlug)
    .map((l) => {
      const overlap = l.keywords.filter((k) =>
        currentKeywords.has(k.toLowerCase()),
      ).length;
      // Also boost by same level
      const levelBoost = l.level === current.level ? 0.5 : 0;
      return { lesson: l, score: overlap + levelBoost };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => s.lesson);
}

/**
 * Find academy lessons related to a set of keywords (e.g. from an article).
 * Returns up to `limit` lessons sorted by keyword overlap score.
 */
export function getRelatedAcademyLessonsByKeywords(
  keywords: string[],
  locale: string,
  limit = 3,
): Lesson[] {
  if (keywords.length === 0) return [];

  const lessons = getAcademyLessons(locale);
  const lowerKeywords = keywords.map((k) => k.toLowerCase());

  const scored = lessons.map((l) => {
    const overlap = l.keywords.filter((k) =>
      lowerKeywords.includes(k.toLowerCase()),
    ).length;
    // Boost if lesson keyword appears in the search keywords
    const titleBoost = lowerKeywords.some((k) =>
      l.title.toLowerCase().includes(k),
    )
      ? 1
      : 0;
    return { lesson: l, score: overlap + titleBoost };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.lesson);
}

export const academyLessons = getAcademyLessons("vi");
