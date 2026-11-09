import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { SwRegister } from "@/components/pwa/sw-register";
import "../globals.css";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { routing } from "@/i18n/routing";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { TelegramFloatButton } from "@/components/layout/telegram-float-button";
import { SessionExtras } from "@/components/layout/header-session-area";
import { AppProviders } from "@/components/providers/app-providers";
import { getSiteUrl } from "@/lib/site-url";

// This is the root layout (there is no app/layout.tsx): owning <html> here lets
// `lang` come from the route param instead of next-intl's getLocale(), which
// reads headers() and forced every page into dynamic rendering.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    metadataBase: new URL(getSiteUrl()),
    robots: { index: true, follow: true },
    verification: { google: "nRnqEpuA6K-k0y-8OatbbTqTUN9fg-fbK8cxuQ-xDNY" },
    title: {
      default: t("titleDefault"),
      template: "%s · Social Forex",
    },
    description: t("description"),
    keywords: t("keywords")
      .split(",")
      .map((k) => k.trim()),
    openGraph: {
      type: "website",
      locale: ogLocale,
      // No `url` here: a layout-level og:url made every page claim to be the
      // homepage. Without it, crawlers fall back to each page's canonical.
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

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#f0b90b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="SocialForex" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-full font-sans antialiased">
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            <AppProviders>
              <div className="print:hidden">
                <SiteHeader />
              </div>
              <main className="mx-auto min-h-[60vh] max-w-7xl px-4 pb-28 pt-10 lg:pb-10 print:min-h-0 print:max-w-none print:p-0">
                {children}
              </main>
              <div className="print:hidden">
                <SiteFooter />
                <TelegramFloatButton />
                <SessionExtras />
              </div>
            </AppProviders>
          </NextIntlClientProvider>
          {/* Vercel-only: the /_vercel/* script endpoints 404 when self-hosted. */}
          {process.env.VERCEL && <AnalyticsProvider />}
          {process.env.VERCEL && <SpeedInsights />}
          <SwRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
