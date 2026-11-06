/**
 * Serialises JSON-LD for a <script> tag. JSON.stringify leaves "<" as-is, so a
 * user-controlled value like "</script><script>…" would break out of the tag.
 */
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

export type ItemListEntry = { name: string; url: string };

/**
 * schema.org ItemList (summary list: each item is a URL to its own page).
 * @see https://developers.google.com/search/docs/appearance/structured-data/carousel
 */
export function buildItemListJsonLd(name: string, items: ItemListEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  };
}
