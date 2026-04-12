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

/** investing = Investing.com (free); fmp = cache DB từ FMP; sample = dữ liệu mẫu; stale_db = cache DB khi API lỗi */
export type CalendarSource = "investing" | "fmp" | "sample" | "stale_db";

export type CalendarWarningKey =
  | "investingApiStaleDb"
  | "investingNoEventsSample"
  | "investingSyncFailedDb"
  | "investingFetchFailedSample"
  | "fmpNoApiKey"
  | "fmpNoRowsSample"
  | "fmp402Sample"
  | "fmpPaywallStaleDb"
  | "fmpSyncFailedDb"
  | "fmpPaywallSample"
  | "fmpSyncFailedSample";

export type CalendarWarning = {
  key: CalendarWarningKey;
  /** Interpolation `{message}` in translation */
  detail?: string;
};

export type ResolveCalendarResult = {
  events: CalendarEvent[];
  source: CalendarSource;
  warning?: CalendarWarning;
  syncedAt?: string;
};
