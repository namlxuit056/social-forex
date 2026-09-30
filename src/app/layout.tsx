import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { getSiteUrl } from "@/lib/site-url";
import { SwRegister } from "@/components/pwa/sw-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Fallback when outside `[locale]`; per-locale SEO is set in `[locale]/layout.tsx`. */
export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Social Forex",
    template: "%s · Social Forex",
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "nRnqEpuA6K-k0y-8OatbbTqTUN9fg-fbK8cxuQ-xDNY",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#10b981" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SocialForex" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-full font-sans antialiased">
        <ThemeProvider>
          {children}
          {/* Vercel-only: the /_vercel/* script endpoints 404 when self-hosted. */}
          {process.env.VERCEL && <AnalyticsProvider />}
          {process.env.VERCEL && <SpeedInsights />}
          <SwRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
