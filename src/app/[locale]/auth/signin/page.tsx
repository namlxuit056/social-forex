import { Suspense } from "react";
import { SiteLogo } from "@/components/layout/site-logo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SignInForm } from "@/components/auth/sign-in-form";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { isGoogleAuthEnabled } from "@/lib/google-auth";
import { safeLocalizedCallbackPath } from "@/lib/safe-redirect";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return { title: t("signInTitle") };
}

function SignInFormFallback() {
  return <div className="mx-auto h-64 max-w-md animate-pulse rounded-xl bg-muted/40" />;
}

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ callbackUrl?: string | string[]; error?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const rawCallbackUrl = Array.isArray(query?.callbackUrl) ? query?.callbackUrl[0] : query?.callbackUrl;
  const callbackUrl = safeLocalizedCallbackPath(rawCallbackUrl);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="text-center">
        <SiteLogo className="mx-auto size-10" />
        <h1 className="mt-4 font-heading text-xl font-semibold tracking-tight text-foreground">
          {t("signInTitle")} Social Forex
        </h1>
      </div>
      {/* Auth.js sends OAuth failures back here as ?error=… */}
      {query?.error ? (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
          {t("oauthFailed")}
        </p>
      ) : null}
      {isGoogleAuthEnabled() ? <GoogleSignInButton callbackUrl={callbackUrl} surface="signin" /> : null}
      <Suspense fallback={<SignInFormFallback />}>
        <SignInForm />
      </Suspense>
      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link
          href="/auth/register"
          className="font-medium text-brand underline-offset-4 hover:underline"
        >
          {t("registerTitle")}
        </Link>
      </p>
    </div>
  );
}
