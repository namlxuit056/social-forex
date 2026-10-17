/** Query param that points /quotes/technical-rating at one signal. */
export const SIGNAL_LINK_PARAM = "signal";

/**
 * Deep link to a technical-rating signal. Uses the notification dedupeKey,
 * which is identical for every recipient of the same signal (row ids differ
 * per user), so one push URL works for everyone.
 */
export function technicalRatingSignalHref(dedupeKey: string): string {
  return `/quotes/technical-rating?${SIGNAL_LINK_PARAM}=${encodeURIComponent(dedupeKey)}`;
}
