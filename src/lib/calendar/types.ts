export type Impact = "low" | "medium" | "high";

/** Trạng thái hiển thị (tính theo thời gian sự kiện so với “giờ hiện tại”). */
export type CalendarEventStatus = "upcoming" | "live" | "finished";

export type CalendarEvent = {
  id: string;
  timeUtc: string;
  currency: string;
  title: string;
  impact: Impact;
  forecast?: string;
  previous?: string;
  /** Giá trị thực tế sau khi công bố (nếu API cung cấp). */
  actual?: string;
};

/** fmp = cache DB từ FMP; sample = dữ liệu mẫu; stale_db = cache DB khi API lỗi */
export type CalendarSource = "fmp" | "sample" | "stale_db";

export type ResolveCalendarResult = {
  events: CalendarEvent[];
  source: CalendarSource;
  warning?: string;
  syncedAt?: string;
};
