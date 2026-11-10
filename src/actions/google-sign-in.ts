"use server";

import { cookies } from "next/headers";
import { signIn } from "@/auth";
import { OAUTH_SIGNUP_COOKIE, isGoogleAuthEnabled } from "@/lib/google-auth";
import { localizedHref } from "@/lib/localized-href";
import { safeLocalizedCallbackPath } from "@/lib/safe-redirect";

/** Starts the Google round trip; the referral code rides along in a short-lived cookie. */
export async function signInWithGoogle(formData: FormData) {
  if (!isGoogleAuthEnabled()) return;

  const locale = formData.get("locale") === "en" ? "en" : "vi";
  const rawCallback = formData.get("callbackUrl");
  const callbackUrl = safeLocalizedCallbackPath(
    typeof rawCallback === "string" ? rawCallback : null,
    "/dashboard",
  );
  const ref = formData.get("ref");

  const jar = await cookies();
  jar.set(
    OAUTH_SIGNUP_COOKIE,
    JSON.stringify({ ref: typeof ref === "string" && ref ? ref : undefined, locale }),
    { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/" },
  );

  await signIn("google", { redirectTo: localizedHref(callbackUrl, locale) });
}
