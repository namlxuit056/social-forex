import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://socialforex.vn";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Social Forex — Cộng đồng & công cụ giao dịch",
    template: "%s · Social Forex",
  },
  description:
    "Tỷ giá, lịch kinh tế, công cụ tính toán, biểu đồ TradingView, diễn đàn và tín hiệu giao dịch forex.",
  keywords: [
    "forex",
    "tỷ giá",
    "lịch kinh tế",
    "tín hiệu giao dịch",
    "trading signals",
    "diễn đàn forex",
    "công cụ forex",
  ],
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: siteUrl,
    siteName: "Social Forex",
    title: "Social Forex — Cộng đồng & công cụ giao dịch",
    description:
      "Tỷ giá live, lịch kinh tế, TradingView, diễn đàn, tín hiệu và academy cho trader.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Social Forex",
    description: "Nền tảng cộng đồng & công cụ giao dịch forex.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full font-sans antialiased">{children}</body>
    </html>
  );
}
