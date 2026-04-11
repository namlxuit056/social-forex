export type Lesson = {
  slug: string;
  title: string;
  level: "beginner" | "intermediate" | "advanced";
  summary: string;
};

export const academyLessons: Lesson[] = [
  {
    slug: "risk-1pct",
    title: "Quy tắc 1–2% rủi ro mỗi lệnh",
    level: "beginner",
    summary: "Cách xác định lot dựa trên stop và vốn để không cháy tài khoản sau chuỗi thua.",
  },
  {
    slug: "spread-liquidity",
    title: "Spread, thanh khoản và giờ vàng",
    level: "beginner",
    summary: "Tại sao chi phí giao dịch thay đổi theo phiên London/New York.",
  },
  {
    slug: "price-action",
    title: "Khung Price Action cơ bản",
    level: "intermediate",
    summary: "Mô hình nến, vùng cung cầu và cách đặt stop hợp lý.",
  },
  {
    slug: "news-trading",
    title: "Giao dịch theo tin: trước và sau sự kiện",
    level: "intermediate",
    summary: "CPI, NFP: kỳ vọng vs thực tế và biến động implied.",
  },
  {
    slug: "smc-intro",
    title: "Giới thiệu Smart Money Concepts",
    level: "advanced",
    summary: "Order blocks, BOS/CHoCH — khung nhìn tổ chức (mang tính học thuật).",
  },
];
