/**
 * Danh mục các nguồn tín hiệu app phát cho user, kèm cách diễn giải. Notification
 * (kind TECHNICAL_RATING_SIGNAL) luôn kèm `meta.source` là một trong các key dưới đây
 * để trang /quotes/technical-rating và push đều ghi rõ tín hiệu đến từ đâu.
 *
 * - tradingview  : điểm kỹ thuật tổng hợp 4H+1D (nguồn gốc, xem notify-technical-rating.ts)
 * - cot          : báo cáo CFTC Commitments of Traders hàng tuần (vị thế quỹ lớn)
 * - oandaBook    : OANDA position book — tỷ lệ long/short khách lẻ (ngược đám đông)
 * - myfxbook     : Myfxbook Community Outlook (ngược đám đông)
 * - igDailyfx    : IG Client Sentiment lấy qua DailyFX (ngược đám đông)
 */
export type SignalSource = "tradingview" | "cot" | "oandaBook" | "myfxbook" | "igDailyfx";

export const SIGNAL_SOURCES: SignalSource[] = [
  "tradingview",
  "cot",
  "oandaBook",
  "myfxbook",
  "igDailyfx",
];

/** "trend" = đi theo chiều nguồn; "contrarian" = ngược lại đám đông khách lẻ. */
export type SignalStance = "trend" | "contrarian";

export const SOURCE_STANCE: Record<SignalSource, SignalStance> = {
  tradingview: "trend",
  cot: "trend",
  oandaBook: "contrarian",
  myfxbook: "contrarian",
  igDailyfx: "contrarian",
};

/** URL gốc để user tự kiểm chứng — hiển thị trong phần chú thích nguồn. */
export const SOURCE_URL: Record<SignalSource, string> = {
  tradingview: "https://www.tradingview.com/symbols/EURUSD/technicals/",
  cot: "https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm",
  oandaBook: "https://www.oanda.com/forex-trading/analysis/open-position-ratios",
  myfxbook: "https://www.myfxbook.com/community/outlook",
  igDailyfx: "https://www.dailyfx.com/sentiment",
};

/** Chi tiết số liệu đính kèm mỗi tín hiệu — hiển thị nguyên văn trên trang lịch sử. */
export type SignalDetail =
  | {
      /** Nguồn dựa trên tỷ lệ lệnh long/short của đám đông khách lẻ. */
      kind: "crowd";
      longPct: number;
      shortPct: number;
      /** OANDA: mức giá có mật độ lệnh dày nhất (vùng thanh khoản). */
      heavyZone?: number | null;
    }
  | {
      /** CFTC COT: vị thế ròng non-commercial (quỹ lớn). */
      kind: "cot";
      /** (long - short) / open interest, theo %. */
      netPct: number;
      /** Thay đổi vị thế ròng trong tuần, đơn vị hợp đồng. */
      weekChange: number;
      /** Ngày báo cáo (yyyy-mm-dd) — dùng cho dedupe theo tuần. */
      reportDate: string;
    };

export type ExternalSignal = {
  source: Exclude<SignalSource, "tradingview">;
  /** Ký hiệu app (QUOTE_DEFINITIONS). */
  symbol: string;
  signal: "buy" | "sell";
  stance: SignalStance;
  detail: SignalDetail;
};

/** Meta lưu trong Notification.meta cho tín hiệu từ nguồn ngoài TradingView. */
export type ExternalSignalMeta = {
  source: Exclude<SignalSource, "tradingview">;
  symbol: string;
  signal: "buy" | "sell";
  stance: SignalStance;
  detail: SignalDetail;
  /** Có khớp với chiều điểm kỹ thuật 4H hiện tại của TradingView không (null = không có dữ liệu). */
  tvAgree: boolean | null;
};

export type SourceOutcome =
  | { ok: true; signals: ExternalSignal[] }
  | { ok: false; reason: string };
