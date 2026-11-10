/** Google sign-in only shows once the OAuth client is configured. */
export function isGoogleAuthEnabled(): boolean {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}

/**
 * Carries the referral code and locale across the Google round trip, so an
 * account created there gets the same setup as one from the register form.
 */
export const OAUTH_SIGNUP_COOKIE = "sf_oauth_signup";

export type OAuthSignupContext = { ref?: string; locale?: string };

export function parseOAuthSignupCookie(raw: string | undefined): OAuthSignupContext {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    return {
      ref: typeof value.ref === "string" ? value.ref.slice(0, 32) : undefined,
      locale: value.locale === "en" || value.locale === "vi" ? value.locale : undefined,
    };
  } catch {
    return {};
  }
}
