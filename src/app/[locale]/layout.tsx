import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { AppProviders } from "@/components/providers/app-providers";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://socialforex.vn";

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
      url: siteUrl,
      siteName: "Social Forex",
      title: t("ogTitle"),
      description: t("ogDescription"),
    },
    twitter: {
      card: "summary_large_image",
      title: t("twitterTitle"),
      description: t("twitterDescription"),
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

  return (
    <NextIntlClientProvider messages={messages}>
      <AppProviders>
        <SiteHeader />
        <main className="mx-auto min-h-[60vh] max-w-7xl px-4 py-10">
          {children}
        </main>
        <SiteFooter />
      </AppProviders>
    </NextIntlClientProvider>
  );
}
