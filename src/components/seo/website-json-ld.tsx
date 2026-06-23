import { getSiteUrl } from "@/lib/site-url";

/**
 * WebSite + Organization structured data for homepage.
 * Helps Google generate sitelinks and brand knowledge panel.
 */
export function WebsiteJsonLd({ locale }: { locale: string }) {
  const siteUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Social Forex",
    url: siteUrl,
    description:
      locale === "vi"
        ? "Cộng đồng giao dịch forex miễn phí — tín hiệu, phân tích AI, công cụ trading, nhật ký giao dịch."
        : "Free forex trading community — signals, AI analysis, trading tools, journal.",
    inLanguage: locale === "vi" ? "vi" : "en",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/articles?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    publisher: {
      "@type": "Organization",
      name: "Social Forex",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/icon-192.png`,
        width: 192,
        height: 192,
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
