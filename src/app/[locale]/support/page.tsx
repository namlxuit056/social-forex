import { Bot, Heart, HeartHandshake, Send, Server, Star } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { PayPalSupportCheckout } from "@/components/support/paypal-support-checkout";
import { getPayPalPublicClientId } from "@/lib/paypal-vip";
import { localeAlternates } from "@/lib/site-url";

const REPO_URL = "https://github.com/namlxuit056/social-forex";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("support");
  return { title: t("title"), description: t("description"), alternates: localeAlternates("/support", locale) };
}

export default async function SupportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("support");

  const uses = [
    { icon: Server, text: t("useHosting") },
    { icon: Bot, text: t("useAi") },
    { icon: HeartHandshake, text: t("useFree") },
  ];

  const otherWays = [
    { icon: Star, href: REPO_URL, label: t("waysStar") },
    { icon: Heart, href: "https://github.com/sponsors/namlxuit056", label: t("waysSponsors") },
    { icon: Send, href: "https://t.me/toolforex", label: t("waysShare") },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader title={t("title")} description={t("description")} />

      <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">{t("usesTitle")}</h2>
          <ul className="space-y-3">
            {uses.map(({ icon: Icon, text }) => (
              <li key={text} className="flex gap-3 text-sm text-muted-foreground">
                <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            {t.rich("openSource", {
              link: (chunks) => (
                <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline-offset-4 hover:underline">
                  {chunks}
                </a>
              ),
            })}
          </p>
        </section>

        <PayPalSupportCheckout
          clientId={getPayPalPublicClientId()}
          copy={{
            chooseAmount: t("chooseAmount"),
            customAmount: t("customAmount"),
            invalidAmount: t("invalidAmount"),
            loading: t("loading"),
            missingConfig: t("missingConfig"),
            success: t("success"),
            error: t("error"),
          }}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">{t("waysTitle")}</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {otherWays.map(({ icon: Icon, href, label }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-3 text-sm text-foreground transition hover:bg-muted"
            >
              <Icon className="size-4 shrink-0 text-primary" aria-hidden />
              {label}
            </a>
          ))}
        </div>
      </section>

      <p className="text-xs text-muted-foreground">{t("note")}</p>
    </div>
  );
}
