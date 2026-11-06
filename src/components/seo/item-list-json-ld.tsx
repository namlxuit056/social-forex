import { buildItemListJsonLd, jsonLdHtml, type ItemListEntry } from "@/lib/json-ld";

/** ItemList structured data for index pages (e.g. the academy lesson list). */
export function ItemListJsonLd({ name, items }: { name: string; items: ItemListEntry[] }) {
  if (items.length === 0) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdHtml(buildItemListJsonLd(name, items)) }}
    />
  );
}
