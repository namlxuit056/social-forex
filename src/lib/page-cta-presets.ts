/** Bộ CTA tái sử dụng cho cuối trang (Giai đoạn A — empty / scaffold). */
export const pageCtas = {
  explore: [
    { href: "/quotes", label: "Tỷ giá live" },
    { href: "/tools", label: "Công cụ" },
    { href: "/dashboard", label: "Dashboard" },
  ],
  trading: [
    { href: "/chart", label: "Biểu đồ" },
    { href: "/calendar", label: "Lịch kinh tế" },
    { href: "/signals", label: "Tín hiệu" },
  ],
  community: [
    { href: "/forum", label: "Diễn đàn" },
    { href: "/leaderboard", label: "BXH" },
    { href: "/messages", label: "Tin nhắn" },
  ],
  learn: [
    { href: "/academy", label: "Academy" },
    { href: "/resources", label: "Tài liệu" },
    { href: "/webinar", label: "Webinar" },
  ],
  risk: [
    { href: "/brokers", label: "So sánh sàn" },
    { href: "/partners", label: "Đối tác / IB" },
    { href: "/profile", label: "Hồ sơ" },
  ],
} as const;
