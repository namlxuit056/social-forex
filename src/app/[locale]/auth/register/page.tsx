import { UserPlus } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { safeLocalizedCallbackPath } from "@/lib/safe-redirect";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return { title: t("registerTitle") };
}

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const rawCallbackUrl = Array.isArray(query?.callbackUrl)
    ? query?.callbackUrl[0]
    : query?.callbackUrl;
  const callbackUrl = safeLocalizedCallbackPath(rawCallbackUrl, "/challenge");

  return (
    <div className="mx-auto max-w-md space-y-8">
      <div className="text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
          <UserPlus className="size-6 text-primary" aria-hidden />
        </div>
        <h1 className="mt-4 font-heading text-2xl font-semibold tracking-tight text-foreground">
          {t("registerTitle")}
        </h1>
      </div>
      <RegisterForm callbackUrl={callbackUrl} />
      <p className="text-center text-sm text-muted-foreground">
        {t("hasAccount")}{" "}
        <Link
          href="/auth/signin"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("signInTitle")}
        </Link>
      </p>
    </div>
  );
}
