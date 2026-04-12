import type { CalendarEvent } from "@/lib/calendar/types";

export type { Impact } from "@/lib/calendar/types";

/** Dữ liệu mẫu khi chưa có FMP_API_KEY hoặc API lỗi và không có cache. */
export const sampleCalendar: CalendarEvent[] = [
  {
    id: "sample-1",
    timeUtc: "2026-04-11T12:30:00.000Z",
    currency: "USD",
    title: "Chỉ số giá tiêu dùng (CPI) tháng",
    impact: "high",
    forecast: "0.3%",
    previous: "0.2%",
  },
  {
    id: "sample-2",
    timeUtc: "2026-04-11T14:00:00.000Z",
    currency: "USD",
    title: "Bài phát biểu FOMC",
    impact: "high",
  },
  {
    id: "sample-3",
    timeUtc: "2026-04-12T12:30:00.000Z",
    currency: "USD",
    title: "Bảng lương phi nông nghiệp (NFP)",
    impact: "high",
    forecast: "185K",
    previous: "192K",
  },
  {
    id: "sample-4",
    timeUtc: "2026-04-11T08:00:00.000Z",
    currency: "EUR",
    title: "Lãi suất ECB",
    impact: "medium",
  },
  {
    id: "sample-5",
    timeUtc: "2026-04-11T09:30:00.000Z",
    currency: "GBP",
    title: "GDP sơ bộ Anh",
    impact: "medium",
    forecast: "0.1%",
    previous: "0.0%",
  },
];
