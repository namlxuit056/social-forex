import sanitizeHtml from "sanitize-html";

const anyValue = [/^[^;"'<>()]*$/];
const cssProps = [
  "text-align", "width", "max-width", "height", "max-height", "margin", "margin-top",
  "margin-bottom", "margin-left", "margin-right", "padding", "color", "background-color",
  "font-weight", "font-style", "text-decoration", "aspect-ratio", "object-fit", "display", "float",
];

/**
 * Strips scripts, event handlers and javascript: URLs from article / academy
 * HTML. That HTML is AI-written from web-search results, so it is untrusted.
 */
export function sanitizeContentHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      "img", "figure", "figcaption", "del", "input",
    ],
    allowedAttributes: {
      "*": ["class", "style", "data-list-item-id"],
      a: ["href", "target", "rel", "title"],
      img: ["src", "srcset", "sizes", "alt", "width", "height", "loading"],
      input: ["type", "checked", "disabled"],
      th: ["colspan", "rowspan", "align"],
      td: ["colspan", "rowspan", "align"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedStyles: { "*": Object.fromEntries(cssProps.map((p) => [p, anyValue])) },
    transformTags: {
      input: (tagName, attribs) =>
        attribs.type === "checkbox"
          ? { tagName, attribs: { ...attribs, disabled: "" } }
          : { tagName: "span", attribs: {} },
    },
  });
}
