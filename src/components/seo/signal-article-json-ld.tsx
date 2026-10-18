import { jsonLdHtml } from "@/lib/json-ld";
type Props = {
  url: string;
  headline: string;
  description: string;
  datePublished: string;
  authorName: string;
  imageUrl?: string | null;
};

/** schema.org Article for signal detail — complements Open Graph metadata. */
export function SignalArticleJsonLd({
  url,
  headline,
  description,
  datePublished,
  authorName,
  imageUrl,
}: Props) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    datePublished,
    author: {
      "@type": "Person",
      name: authorName,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };
  if (imageUrl) {
    data.image = [imageUrl];
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdHtml(data) }}
    />
  );
}
