export type Impact = "low" | "medium" | "high";

export type CalendarEvent = {
  id: string;
  timeUtc: string;
  currency: string;
  title: string;
  impact: Impact;
  forecast?: string;
  previous?: string;
};

/** Dữ liệu mẫu — thay bằng sync API lịch kinh tế (Forexfactory, TradingEconomics, v.v.) */
export const sampleCalendar: CalendarEvent[] = [
  {
    id: "1",
    timeUtc: "2026-04-11T12:30:00.000Z",
    currency: "USD",
    title: "Chỉ số giá tiêu dùng (CPI) tháng",
    impact: "high",
    forecast: "0.3%",
    previous: "0.2%",
  },
  {
    id: "2",
    timeUtc: "2026-04-11T14:00:00.000Z",
    currency: "USD",
    title: "Bài phát biểu FOMC",
    impact: "high",
  },
  {
    id: "3",
    timeUtc: "2026-04-12T12:30:00.000Z",
    currency: "USD",
    title: "Bảng lương phi nông nghiệp (NFP)",
    impact: "high",
    forecast: "185K",
    previous: "192K",
  },
  {
    id: "4",
    timeUtc: "2026-04-11T08:00:00.000Z",
    currency: "EUR",
    title: "Lãi suất ECB",
    impact: "medium",
  },
  {
    id: "5",
    timeUtc: "2026-04-11T09:30:00.000Z",
    currency: "GBP",
    title: "GDP sơ bộ Anh",
    impact: "medium",
    forecast: "0.1%",
    previous: "0.0%",
  },
];
