import { Suspense } from "react";
import { LineChart, Shield } from "lucide-react";
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
    <div className="mx-auto max-w-md space-y-8">
      <div className="text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
          <LineChart className="size-6 text-primary" aria-hidden />
        </div>
        <h1 className="mt-4 font-heading text-xl font-semibold tracking-tight text-foreground">
          {t("signInTitle")} Social Forex
        </h1>
        <p className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Shield className="size-3.5 shrink-0" aria-hidden />
          Social Forex
        </p>
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
