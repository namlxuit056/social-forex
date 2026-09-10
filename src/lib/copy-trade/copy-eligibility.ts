// Which of a provider's signals a follower's copy EA should be offered on a given
// poll of `GET /api/copy-trade/signals`.
//
// The dangerous case this guards against: a signal that has been ACTIVE for a
// while (the provider just hasn't closed it yet) used to be served on every poll
// forever. A follower whose EA lost its in-memory/on-disk dedupe state — terminal
// or VPS restart, a re-subscribe, or copy toggled off then on — then treated that
// signal as brand new and fired a **market** order at a price that had long since
// moved away from the signal's entry ("vào lệnh ngay lập tức dù không đúng giá").
//
// Rules:
//  - CLOSED_WIN / CLOSED_LOSS / CANCELLED: served for 24h after close so the EA
//    can exit / cancel a position it already copied.
//  - Anything created before the follower subscribed: never served.
//  - PENDING: always served (within the subscription lifetime). The EA mirrors it
//    as a pending order at the provider's exact entry price, so there is no
//    "wrong price" risk no matter how old it is.
//  - ACTIVE: served only briefly after the provider opened it. A market copy fills
//    at the follower's current price, so it must happen close in time to the
//    provider's own entry or not at all — the follower does not chase price.

export const COPY_OPEN_GRACE_MS = 10 * 60 * 1000;
export const COPY_CLOSED_LOOKBACK_MS = 24 * 60 * 60 * 1000;

const CLOSED_STATUSES = new Set(["CLOSED_WIN", "CLOSED_LOSS", "CANCELLED"]);

export type CopySignalRow = {
  status: string;
  createdAt: Date;
  closedAt: Date | null;
};

export function isCopySignalEligible(
  signal: CopySignalRow,
  subscribedAt: Date,
  now: Date = new Date(),
): boolean {
  if (CLOSED_STATUSES.has(signal.status)) {
    return (
      signal.closedAt != null &&
      now.getTime() - signal.closedAt.getTime() <= COPY_CLOSED_LOOKBACK_MS
    );
  }

  if (signal.createdAt.getTime() < subscribedAt.getTime()) return false;

  if (signal.status === "PENDING") return true;

  if (signal.status === "ACTIVE") {
    return now.getTime() - signal.createdAt.getTime() <= COPY_OPEN_GRACE_MS;
  }

  return false;
}

// Lower bound on `createdAt` for ACTIVE signals worth fetching at all — lets the
// DB query itself drop stale open signals instead of pulling 20 rows and
// filtering them out in JS.
export function copyActiveOpenSince(subscribedAt: Date, now: Date = new Date()): Date {
  return new Date(Math.max(subscribedAt.getTime(), now.getTime() - COPY_OPEN_GRACE_MS));
}
