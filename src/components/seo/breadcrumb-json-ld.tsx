import { absoluteUrl } from "@/lib/site-url";

type BreadcrumbItem = { name: string; path: string };

/**
 * BreadcrumbList structured data for enhanced search results.
 * @see https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
 */
export function BreadcrumbJsonLd({
  items,
  locale,
}: {
  items: BreadcrumbItem[];
  locale: string;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path, locale),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
