import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { TelegramFloatButton } from "@/components/layout/telegram-float-button";
import { BottomAppNav } from "@/components/layout/bottom-app-nav";
import { MoodCheckinNudge } from "@/components/journal/mood-checkin-nudge";
import { AppProviders } from "@/components/providers/app-providers";
import { getSiteUrl } from "@/lib/site-url";
import { auth } from "@/auth";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    return {};
  }
  setRequestLocale(locale);
  const t = await getTranslations("siteMeta");
  const ogLocale = locale === "en" ? "en_US" : "vi_VN";

  return {
    title: {
      default: t("titleDefault"),
      template: "%s · Social Forex",
    },
    description: t("description"),
    keywords: t("keywords").split(",").map((k) => k.trim()),
    openGraph: {
      type: "website",
      locale: ogLocale,
      url: getSiteUrl(),
      siteName: "Social Forex",
      title: t("ogTitle"),
      description: t("ogDescription"),
      images: [
        {
          url: `${getSiteUrl()}/og-default.png`,
          width: 1200,
          height: 630,
          alt: "Social Forex",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("twitterTitle"),
      description: t("twitterDescription"),
      images: [`${getSiteUrl()}/og-default.png`],
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const session = await auth();

  return (
    <NextIntlClientProvider messages={messages}>
      <AppProviders>
        <SiteHeader />
        <main className="mx-auto min-h-[60vh] max-w-7xl px-4 pb-28 pt-10 lg:pb-10">
          {children}
        </main>
        <SiteFooter />
        <TelegramFloatButton />
        {session?.user?.id ? <BottomAppNav userId={session.user.id} /> : null}
        {session?.user?.id ? <MoodCheckinNudge /> : null}
      </AppProviders>
    </NextIntlClientProvider>
  );
}
