import { Suspense } from "react";
import { SiteLogo } from "@/components/layout/site-logo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SignInForm } from "@/components/auth/sign-in-form";

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
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="text-center">
        <SiteLogo className="mx-auto size-10" />
        <h1 className="mt-4 font-heading text-xl font-semibold tracking-tight text-foreground">
          {t("signInTitle")} Social Forex
        </h1>
      </div>
      <Suspense fallback={<SignInFormFallback />}>
        <SignInForm />
      </Suspense>
      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link
          href="/auth/register"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("registerTitle")}
        </Link>
      </p>
    </div>
  );
}
