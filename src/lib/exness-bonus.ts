/** Số tiền thưởng (USD) cho mỗi user hoàn thành chương trình Exness + MT5 Bridge. */
export const EXNESS_BONUS_AMOUNT_USD = 10;

/** Bridge phải gửi heartbeat trong khoảng này mới coi là "đang kết nối". */
export const EXNESS_BRIDGE_FRESH_MS = 7 * 24 * 60 * 60 * 1000;

export const EXNESS_BONUS_PAYOUT_METHODS = ["usdt-trc20", "bank", "exness"] as const;
export type ExnessBonusPayoutMethod = (typeof EXNESS_BONUS_PAYOUT_METHODS)[number];

export interface BridgeConnectionLike {
  revokedAt: Date | null;
  lastSeenAt: Date | null;
  accountLogin: string | null;
  accountServer: string | null;
  accountCompany: string | null;
}

/** Tài khoản MT5 thuộc Exness (dựa vào company/server mà EA báo về). */
export function isExnessAccount(c: Pick<BridgeConnectionLike, "accountCompany" | "accountServer">): boolean {
  const hay = `${c.accountCompany ?? ""} ${c.accountServer ?? ""}`.toLowerCase();
  return hay.includes("exness");
}

/**
 * Bridge đủ điều kiện nhận thưởng: chưa thu hồi, đã báo số tài khoản,
 * là tài khoản Exness, và heartbeat gần đây.
 * Lưu ý: KHÔNG kiểm chứng được tài khoản có mở qua link affiliate hay không —
 * admin phải đối chiếu trong Exness Partner portal.
 */
export function isEligibleExnessBridge(c: BridgeConnectionLike, now: Date = new Date()): boolean {
  if (c.revokedAt) return false;
  if (!c.accountLogin) return false;
  if (!c.lastSeenAt || now.getTime() - c.lastSeenAt.getTime() > EXNESS_BRIDGE_FRESH_MS) return false;
  return isExnessAccount(c);
}

/** Tài khoản demo không được tính (server Exness demo có chữ "Trial"/"Demo"). */
export function isExnessDemoServer(server: string | null): boolean {
  if (!server) return false;
  return /trial|demo/i.test(server);
}
