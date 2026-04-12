/** Default Exness OneLink affiliate URL (override with NEXT_PUBLIC_EXNESS_AFFILIATE_URL). */
export const EXNESS_AFFILIATE_URL_DEFAULT =
  "https://one.exnessonelink.com/a/nmm9gkpy67";

export function getExnessAffiliateUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_EXNESS_AFFILIATE_URL?.trim();
  if (fromEnv) return fromEnv;
  return EXNESS_AFFILIATE_URL_DEFAULT;
}
