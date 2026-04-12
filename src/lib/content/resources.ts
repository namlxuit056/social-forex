export type ResourceItem = {
  title: string;
  kind: "pdf" | "link";
  href: string;
  note?: string;
};

export const ebookResources: ResourceItem[] = [
  {
    title: "BabyPips — School of Pipsology",
    kind: "link",
    href: "https://www.babypips.com/learn/forex",
    note: "Khóa học forex miễn phí, phổ biến nhất thế giới. Tiếng Anh.",
  },
  {
    title: "Investopedia — Forex Trading Guide",
    kind: "link",
    href: "https://www.investopedia.com/articles/forex/11/why-trade-forex.asp",
    note: "Hướng dẫn tổng quan cho người mới bắt đầu.",
  },
  {
    title: "Trading in the Zone — Mark Douglas (tóm tắt)",
    kind: "link",
    href: "https://www.investopedia.com/articles/trading/02/110502.asp",
    note: "Tâm lý giao dịch — cuốn sách kinh điển mà mọi trader nên đọc.",
  },
  {
    title: "Forex Factory — Economic Calendar",
    kind: "link",
    href: "https://www.forexfactory.com/calendar",
    note: "Lịch kinh tế chi tiết, bộ lọc theo mức ảnh hưởng.",
  },
  {
    title: "TradingView — Charting & Community",
    kind: "link",
    href: "https://www.tradingview.com/",
    note: "Nền tảng biểu đồ chuyên nghiệp, ý tưởng giao dịch từ cộng đồng.",
  },
  {
    title: "MyFxBook — Trade Tracking",
    kind: "link",
    href: "https://www.myfxbook.com/",
    note: "Theo dõi hiệu suất giao dịch, so sánh hệ thống.",
  },
];
