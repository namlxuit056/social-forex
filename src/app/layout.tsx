import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getSiteUrl } from "@/lib/site-url";
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
    google: "wVv2JiPJMreuCNxpC5wU0itHzmgg4TZHwodUjP3vbTI",
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
      <body className="min-h-full font-sans antialiased">
        {children}
        <Analytics
          beforeSend={(event) => {
            // Exclude admin and API traffic from Vercel Analytics
            if (event.url.includes("/admin") || event.url.includes("/api/")) {
              return null;
            }
            return event;
          }}
        />
        <SpeedInsights />
      </body>
    </html>
  );
}
