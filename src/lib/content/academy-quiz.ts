export type QuizQuestion = {
  question: { vi: string; en: string };
  options: { vi: string; en: string }[];
  correctIndex: number;
};

export const academyQuiz: Record<string, QuizQuestion> = {
  "how-to-read-forex-economic-calendar": {
    question: {
      vi: "Chỉ số nào thường gây biến động lớn nhất trên thị trường forex?",
      en: "Which economic indicator typically causes the largest forex market moves?",
    },
    options: [
      { vi: "Số đơn xin trợ cấp thất nghiệp hàng tuần", en: "Weekly jobless claims" },
      { vi: "Non-Farm Payrolls (NFP)", en: "Non-Farm Payrolls (NFP)" },
      { vi: "Chỉ số niềm tin tiêu dùng", en: "Consumer confidence index" },
      { vi: "Doanh số bán lẻ", en: "Retail sales" },
    ],
    correctIndex: 1,
  },
  "risk-reward-ratio-explained": {
    question: {
      vi: "Nếu bạn đặt SL = 20 pip và TP = 60 pip, tỷ lệ R:R là bao nhiêu?",
      en: "If your SL = 20 pips and TP = 60 pips, what is the R:R ratio?",
    },
    options: [
      { vi: "1:1", en: "1:1" },
      { vi: "1:2", en: "1:2" },
      { vi: "1:3", en: "1:3" },
      { vi: "2:1", en: "2:1" },
    ],
    correctIndex: 2,
  },
  "how-to-calculate-forex-lot-size": {
    question: {
      vi: "1 standard lot EURUSD tương đương bao nhiêu đơn vị tiền tệ?",
      en: "1 standard lot of EURUSD equals how many currency units?",
    },
    options: [
      { vi: "1.000 units", en: "1,000 units" },
      { vi: "10.000 units", en: "10,000 units" },
      { vi: "100.000 units", en: "100,000 units" },
      { vi: "1.000.000 units", en: "1,000,000 units" },
    ],
    correctIndex: 2,
  },
  "nonfarm-payrolls-gold-xauusd": {
    question: {
      vi: "NFP thường được công bố vào thời điểm nào?",
      en: "When is NFP typically released?",
    },
    options: [
      { vi: "Thứ Tư đầu tiên mỗi tháng lúc 20:30 GMT+7", en: "First Wednesday of each month at 20:30 GMT+7" },
      { vi: "Thứ Sáu đầu tiên mỗi tháng lúc 19:30 GMT+7", en: "First Friday of each month at 19:30 GMT+7" },
      { vi: "Mỗi tuần vào thứ Năm", en: "Every Thursday" },
      { vi: "Thứ Hai cuối mỗi tháng", en: "Last Monday of each month" },
    ],
    correctIndex: 1,
  },
  "forex-backtesting-for-beginners": {
    question: {
      vi: "Mục đích chính của backtesting là gì?",
      en: "What is the main purpose of backtesting?",
    },
    options: [
      { vi: "Kiếm lợi nhuận ngay lập tức", en: "Make immediate profits" },
      { vi: "Kiểm tra chiến lược trên dữ liệu lịch sử để đánh giá hiệu quả", en: "Test a strategy on historical data to evaluate its effectiveness" },
      { vi: "Dự đoán giá chính xác 100%", en: "Predict prices with 100% accuracy" },
      { vi: "Tìm broker tốt nhất", en: "Find the best broker" },
    ],
    correctIndex: 1,
  },
  "xauusd-risk-management": {
    question: {
      vi: "Quy tắc 1% trong quản lý rủi ro có nghĩa là gì?",
      en: "What does the 1% rule in risk management mean?",
    },
    options: [
      { vi: "Chỉ sử dụng 1% đòn bẩy", en: "Only use 1% leverage" },
      { vi: "Mỗi lệnh chỉ rủi ro tối đa 1% tài khoản", en: "Risk a maximum of 1% of account per trade" },
      { vi: "Chỉ giao dịch 1 lần mỗi ngày", en: "Only trade once per day" },
      { vi: "Giữ 1% tiền mặt dự phòng", en: "Keep 1% cash reserve" },
    ],
    correctIndex: 1,
  },
  "forex-spread-and-slippage": {
    question: {
      vi: "Spread là gì trong giao dịch forex?",
      en: "What is spread in forex trading?",
    },
    options: [
      { vi: "Lợi nhuận của trader", en: "Trader's profit" },
      { vi: "Sự chênh lệch giữa giá Bid và Ask", en: "The difference between Bid and Ask price" },
      { vi: "Phí hoa hồng của broker", en: "Broker commission fee" },
      { vi: "Khoảng cách đặt Stop Loss", en: "Stop loss distance" },
    ],
    correctIndex: 1,
  },
  "london-new-york-session-overlap": {
    question: {
      vi: "Phiên giao nhau London-New York thường diễn ra vào khung giờ nào (GMT+7)?",
      en: "When does the London-New York overlap session typically occur (GMT+7)?",
    },
    options: [
      { vi: "06:00 – 08:00", en: "06:00 – 08:00" },
      { vi: "12:00 – 14:00", en: "12:00 – 14:00" },
      { vi: "19:00 – 21:00", en: "19:00 – 21:00" },
      { vi: "22:00 – 00:00", en: "22:00 – 00:00" },
    ],
    correctIndex: 2,
  },
  "support-and-resistance-basics": {
    question: {
      vi: "Khi giá phá vỡ vùng resistance, vùng đó thường trở thành gì?",
      en: "When price breaks through a resistance zone, it typically becomes?",
    },
    options: [
      { vi: "Vùng resistance mới mạnh hơn", en: "A stronger resistance zone" },
      { vi: "Vùng support mới", en: "A new support zone" },
      { vi: "Điểm vào lệnh sell", en: "A sell entry point" },
      { vi: "Không có ý nghĩa gì", en: "It has no significance" },
    ],
    correctIndex: 1,
  },
  "forex-trading-journal-guide": {
    question: {
      vi: "Lý do quan trọng nhất để ghi nhật ký giao dịch là gì?",
      en: "What is the most important reason to keep a trading journal?",
    },
    options: [
      { vi: "Để khoe với người khác", en: "To show others your trades" },
      { vi: "Để phân tích và cải thiện chiến lược theo thời gian", en: "To analyze and improve your strategy over time" },
      { vi: "Để tính thuế", en: "For tax purposes" },
      { vi: "Vì broker yêu cầu", en: "Because brokers require it" },
    ],
    correctIndex: 1,
  },
  "cpi-inflation-forex-impact": {
    question: {
      vi: "CPI tăng cao thường tác động thế nào đến đồng tiền của quốc gia đó?",
      en: "High CPI typically has what effect on a country's currency?",
    },
    options: [
      { vi: "Luôn làm đồng tiền mạnh lên", en: "Always strengthens the currency" },
      { vi: "Có thể làm đồng tiền yếu đi nếu ngân hàng trung ương không tăng lãi suất", en: "May weaken the currency if the central bank doesn't raise rates" },
      { vi: "Không ảnh hưởng đến tỷ giá", en: "Has no effect on exchange rates" },
      { vi: "Luôn làm đồng tiền yếu đi", en: "Always weakens the currency" },
    ],
    correctIndex: 1,
  },
  "interest-rates-and-currency-strength": {
    question: {
      vi: "Khi ngân hàng trung ương tăng lãi suất, điều gì thường xảy ra với đồng tiền?",
      en: "When a central bank raises interest rates, what typically happens to the currency?",
    },
    options: [
      { vi: "Đồng tiền yếu đi", en: "The currency weakens" },
      { vi: "Không có thay đổi", en: "No change occurs" },
      { vi: "Đồng tiền mạnh lên vì dòng vốn đầu tư tăng", en: "The currency strengthens due to increased capital inflows" },
      { vi: "Lãi suất không liên quan đến tỷ giá", en: "Interest rates have no relation to exchange rates" },
    ],
    correctIndex: 2,
  },
  "forex-beginner-mistakes": {
    question: {
      vi: "Lỗi phổ biến nhất của trader mới là gì?",
      en: "What is the most common mistake of new traders?",
    },
    options: [
      { vi: "Dùng đòn bẩy quá cao và không đặt Stop Loss", en: "Using excessive leverage and not placing Stop Loss" },
      { vi: "Giao dịch quá ít", en: "Trading too infrequently" },
      { vi: "Chọn broker uy tín", en: "Choosing a reputable broker" },
      { vi: "Nghiên cứu thị trường quá nhiều", en: "Over-researching the market" },
    ],
    correctIndex: 0,
  },
  "forex-demo-account-practice": {
    question: {
      vi: "Lợi ích chính của tài khoản demo là gì?",
      en: "What is the main benefit of a demo account?",
    },
    options: [
      { vi: "Kiếm tiền thật nhanh hơn", en: "Earn real money faster" },
      { vi: "Luyện tập chiến lược không rủi ro vốn thật", en: "Practice strategies without risking real capital" },
      { vi: "Truy cập dữ liệu thị trường tốt hơn", en: "Access better market data" },
      { vi: "Nhận bonus từ broker", en: "Receive bonuses from brokers" },
    ],
    correctIndex: 1,
  },
  "mt5-order-types-beginner": {
    question: {
      vi: "Lệnh 'Limit Order' trong MT5 thực hiện khi nào?",
      en: "When does a 'Limit Order' execute in MT5?",
    },
    options: [
      { vi: "Ngay lập tức theo giá thị trường", en: "Immediately at market price" },
      { vi: "Khi giá chạm đến mức giá đã đặt trước", en: "When price reaches a pre-set price level" },
      { vi: "Chỉ trong phiên London", en: "Only during the London session" },
      { vi: "Khi có tin tức kinh tế", en: "When economic news is released" },
    ],
    correctIndex: 1,
  },
  "forex-trend-analysis": {
    question: {
      vi: "Phương pháp nào được dùng để xác định xu hướng thị trường?",
      en: "Which method is used to identify market trends?",
    },
    options: [
      { vi: "Đọc tin tức tài chính", en: "Reading financial news" },
      { vi: "Phân tích đường MA (Moving Average) và chuỗi Higher High / Higher Low", en: "Analyzing MA lines and Higher High / Higher Low patterns" },
      { vi: "Dùng cảm xúc để đoán chiều giá", en: "Using emotions to guess price direction" },
      { vi: "Hỏi trader khác", en: "Asking other traders" },
    ],
    correctIndex: 1,
  },
  "candlestick-patterns-forex": {
    question: {
      vi: "Mô hình Doji thường báo hiệu điều gì?",
      en: "What does a Doji candlestick pattern typically signal?",
    },
    options: [
      { vi: "Xu hướng tăng mạnh sẽ tiếp tục", en: "A strong uptrend will continue" },
      { vi: "Sự do dự của thị trường, khả năng đảo chiều", en: "Market indecision, potential reversal" },
      { vi: "Xu hướng giảm mạnh chắc chắn", en: "A definite strong downtrend" },
      { vi: "Không có ý nghĩa kỹ thuật", en: "No technical significance" },
    ],
    correctIndex: 1,
  },
  "breakout-vs-fakeout": {
    question: {
      vi: "Dấu hiệu nào giúp phân biệt breakout thật với fakeout?",
      en: "What sign helps distinguish a real breakout from a fakeout?",
    },
    options: [
      { vi: "Giá phá vỡ là đủ, không cần thêm điều kiện", en: "Price breaking through is enough, no extra conditions needed" },
      { vi: "Khối lượng giao dịch cao + nến đóng cửa rõ ràng vượt vùng", en: "High volume + candle closing clearly beyond the zone" },
      { vi: "Tin tức tốt cho đồng tiền đó", en: "Positive news for that currency" },
      { vi: "Giá tăng liên tục 3 nến", en: "Price rising for 3 consecutive candles" },
    ],
    correctIndex: 1,
  },
  "forex-news-trading-risks": {
    question: {
      vi: "Rủi ro lớn nhất khi giao dịch theo tin tức là gì?",
      en: "What is the biggest risk when trading the news?",
    },
    options: [
      { vi: "Tin tức không đáng tin cậy", en: "News not being reliable" },
      { vi: "Slippage và spread giãn rộng trong thời điểm biến động cao", en: "Slippage and wide spreads during high volatility periods" },
      { vi: "Broker không cho phép giao dịch", en: "Broker not allowing trades" },
      { vi: "Khó tìm nguồn tin tức", en: "Difficulty finding news sources" },
    ],
    correctIndex: 1,
  },
  "forex-position-sizing-1-percent-rule": {
    question: {
      vi: "Với tài khoản $10,000 và quy tắc 1%, bạn tối đa rủi ro bao nhiêu mỗi lệnh?",
      en: "With a $10,000 account and the 1% rule, what is your maximum risk per trade?",
    },
    options: [
      { vi: "$10", en: "$10" },
      { vi: "$100", en: "$100" },
      { vi: "$500", en: "$500" },
      { vi: "$1,000", en: "$1,000" },
    ],
    correctIndex: 1,
  },
  "price-action-pin-bar": {
    question: {
      vi: "Pin bar tăng có xác suất cao nhất khi xuất hiện ở đâu?",
      en: "Where does a bullish pin bar have the highest probability setup?",
    },
    options: [
      { vi: "Giữa vùng đi ngang, không có bối cảnh rõ ràng", en: "In the middle of a range with no clear context" },
      { vi: "Tại vùng hỗ trợ rõ ràng sau xu hướng giảm hoặc pullback", en: "At a clear support zone after a downtrend or pullback" },
      { vi: "Ngay sau một tin tức quan trọng", en: "Right after a major news release" },
      { vi: "Trên bất kỳ khung thời gian nào, bất kỳ vị trí nào", en: "On any timeframe, at any location" },
    ],
    correctIndex: 1,
  },
  "price-action-engulfing": {
    question: {
      vi: "Điều nào làm tín hiệu bullish engulfing mạnh hơn?",
      en: "Which factor makes a bullish engulfing signal stronger?",
    },
    options: [
      { vi: "Nến xanh chỉ nhỉnh hơn nến đỏ một chút", en: "The green candle is only slightly larger than the red one" },
      { vi: "Mô hình xuất hiện giữa vùng đi ngang", en: "The pattern appears in the middle of a range" },
      { vi: "Nến xanh lớn hơn đáng kể và xuất hiện tại vùng hỗ trợ rõ ràng", en: "The green candle is significantly larger and appears at a clear support zone" },
      { vi: "Nến đỏ trước đó có bóng dài", en: "The preceding red candle has long wicks" },
    ],
    correctIndex: 2,
  },
  "price-action-inside-bar": {
    question: {
      vi: "Inside bar thường báo hiệu điều gì trong price action?",
      en: "What does an inside bar typically signal in price action?",
    },
    options: [
      { vi: "Xu hướng tăng mạnh sắp xảy ra", en: "A strong uptrend is about to begin" },
      { vi: "Sự nén giá và tích lũy năng lượng cho breakout", en: "Price compression and energy building for a breakout" },
      { vi: "Đảo chiều xu hướng chắc chắn", en: "A guaranteed trend reversal" },
      { vi: "Thị trường đang rất biến động", en: "The market is highly volatile" },
    ],
    correctIndex: 1,
  },
  "price-action-bos-choch-fvg": {
    question: {
      vi: "Sự khác biệt chính giữa BOS và CHoCH là gì?",
      en: "What is the key difference between BOS and CHoCH?",
    },
    options: [
      { vi: "BOS xảy ra trên Daily, CHoCH xảy ra trên H1", en: "BOS occurs on Daily, CHoCH occurs on H1" },
      { vi: "BOS xác nhận xu hướng tiếp diễn, CHoCH cảnh báo xu hướng có thể đảo chiều", en: "BOS confirms trend continuation, CHoCH warns the trend may be reversing" },
      { vi: "BOS là tín hiệu giảm, CHoCH là tín hiệu tăng", en: "BOS is a bearish signal, CHoCH is a bullish signal" },
      { vi: "Cả hai đều có ý nghĩa như nhau", en: "Both have the same meaning" },
    ],
    correctIndex: 1,
  },
};

export function getQuizQuestion(slug: string): QuizQuestion | undefined {
  return academyQuiz[slug];
}
