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
