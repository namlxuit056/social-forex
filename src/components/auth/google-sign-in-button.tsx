"use client";

import { useFormStatus } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { signInWithGoogle } from "@/actions/google-sign-in";
import { Button } from "@/components/ui/button";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { trackInternalEvent } from "@/lib/internal-analytics";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3.02c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.11A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.28 14.28a7.2 7.2 0 0 1 0-4.56V6.61H1.27a12 12 0 0 0 0 10.78l4.01-3.11Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.27 6.61l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77Z" />
    </svg>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("auth");
  return (
    <Button type="submit" variant="outline" className="h-10 w-full gap-2" disabled={pending}>
      <GoogleMark />
      {pending ? t("googleRedirecting") : t("continueWithGoogle")}
    </Button>
  );
}

/** "Continue with Google" plus an "or" divider above the email form. */
export function GoogleSignInButton({
  callbackUrl,
  referralCode,
  surface,
}: {
  callbackUrl: string;
  referralCode?: string;
  surface: "signin" | "register";
}) {
  const locale = useLocale();
  const t = useTranslations("auth");

  return (
    <div className="space-y-4">
      <form
        action={signInWithGoogle}
        onSubmit={() => trackInternalEvent(ANALYTICS_EVENTS.googleAuthClick, { surface })}
      >
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        {referralCode ? <input type="hidden" name="ref" value={referralCode} /> : null}
        <SubmitButton />
      </form>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t("orWithEmail")}
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
