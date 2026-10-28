import postcss, { type AtRule, type Rule } from "postcss";

/** Class on the article body wrapper that every hand-written CSS rule is scoped under. */
export const ARTICLE_SCOPE_CLASS = "article-custom";

const SCOPE = `.${ARTICLE_SCOPE_CLASS}`;
const ALLOWED_AT_RULES = new Set(["media", "supports", "keyframes", "-webkit-keyframes"]);
// Remote loads (tracking / exfiltration) and legacy script-in-CSS vectors.
const UNSAFE_VALUE = /url\s*\(|image-set\s*\(|expression\s*\(|javascript:|@import/i;
const UNSAFE_PROPS = new Set(["behavior", "-moz-binding"]);
const PAGE_ROOT = /^(?:html\s*)?(?:body|:root|html)(?![-\w])/i;
// The rest of the root's compound selector: `:root:not([data-theme="light"])`, `body::before`.
const ROOT_COMPOUND = /^(?:\[[^\]]*\]|:not\([^)]*\)|::?[-\w]+(?:\([^)]*\))?|[.#][-\w]+)*/;
const THEME_ATTR = /:not\(\s*\[data-theme=["']?(dark|light)["']?\]\s*\)|\[data-theme=["']?(dark|light)["']?\]/gi;
const COLOR_SCHEME_MEDIA = /^\s*\(\s*prefers-color-scheme\s*:\s*(dark|light)\s*\)\s*$/i;

type Theme = "dark" | "light";
// The site toggles dark mode with a `.dark` class on <html> (next-themes).
const THEME_ANCESTOR: Record<Theme, string> = { dark: ".dark ", light: "html:not(.dark) " };

const STYLE_BLOCK = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
const BODY_INNER = /<body\b[^>]*>([\s\S]*?)<\/body>/i;

/**
 * Splits an article body into its HTML and the CSS from its `<style>` blocks.
 * A pasted full page (`<!DOCTYPE><html><head>…`) is reduced to its `<body>`
 * content, so `<title>` and other head text never reach the page.
 */
export function splitArticleHtml(body: string): { html: string; css: string } {
  const css: string[] = [];
  const withoutStyles = body.replace(STYLE_BLOCK, (_, content: string) => {
    css.push(content);
    return "";
  });
  const bodyMatch = withoutStyles.match(BODY_INNER);
  const html = bodyMatch
    ? bodyMatch[1]
    : withoutStyles
        .replace(/<!doctype[^>]*>/gi, "")
        .replace(/<head\b[\s\S]*?<\/head>/gi, "")
        .replace(/<title\b[\s\S]*?<\/title>/gi, "")
        .replace(/<(?:meta|link|base)\b[^>]*>/gi, "")
        .replace(/<\/?(?:html|body)\b[^>]*>/gi, "");
  return { html: html.trim(), css: css.join("\n") };
}

const ENTITIES: Record<string, string> = {
  "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " ", "&amp;": "&",
};

/**
 * HTML source pasted into the visual editor is stored as escaped text inside
 * <p>/<br> (`<p>&lt;div&gt;…</p>`). Turns such a body back into the HTML it
 * spells out; any other body is returned unchanged.
 */
export function unescapePastedHtml(body: string): string {
  const tags = body.match(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi) ?? [];
  const onlyTextBlocks = tags.every((tag) => /^<\/?(?:p|br)\b/i.test(tag));
  if (!onlyTextBlocks || !/&lt;\/?[a-z][a-z0-9]*\b[^]*?&gt;/i.test(body)) return body;
  return body
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p\b[^>]*>/gi, "\n")
    .replace(/<\/?p\b[^>]*>/gi, "")
    .replace(/&(?:lt|gt|quot|#39|nbsp|amp);/g, (entity) => ENTITIES[entity])
    .trim();
}

/**
 * Prefixes a selector with the article wrapper. Page-level selectors (`body`,
 * `:root`, `html`) become the wrapper itself; a `[data-theme]` on them, or an
 * enclosing prefers-color-scheme query, follows the site's theme instead.
 */
function scopeSelector(selector: string, mediaTheme?: Theme): string {
  const trimmed = selector.trim();
  const root = trimmed.match(PAGE_ROOT);
  if (!root) return `${mediaTheme ? THEME_ANCESTOR[mediaTheme] : ""}${SCOPE} ${trimmed}`;

  const afterRoot = trimmed.slice(root[0].length);
  const compound = afterRoot.match(ROOT_COMPOUND)?.[0] ?? "";
  let theme = mediaTheme;
  // `:not([data-theme="light"])` is always true on the wrapper; only an explicit theme counts.
  const ownCompound = compound.replace(THEME_ATTR, (...groups: (string | undefined)[]) => {
    if (groups[2]) theme = groups[2].toLowerCase() as Theme;
    return "";
  });
  const ancestor = theme ? THEME_ANCESTOR[theme] : "";
  return `${ancestor}${SCOPE}${ownCompound}${afterRoot.slice(compound.length)}`;
}

function insideKeyframes(rule: Rule) {
  const parent = rule.parent;
  return parent?.type === "atrule" && /keyframes$/i.test((parent as AtRule).name);
}

/**
 * Confines hand-written article CSS to the article wrapper: page-level
 * selectors (`body`, `:root`, `html`) target the wrapper itself and every
 * other selector is prefixed with it, so the site header and layout are never
 * restyled. Drops @import/@font-face, url() values and `position: fixed`.
 * Returns "" for CSS that does not parse.
 */
export function scopeArticleCss(css: string): string {
  if (!css.trim()) return "";
  let root;
  try {
    root = postcss.parse(css);
  } catch {
    return "";
  }

  root.walkAtRules((atRule) => {
    if (!ALLOWED_AT_RULES.has(atRule.name.toLowerCase())) atRule.remove();
  });
  const themed = new WeakSet<Rule>();
  root.walkAtRules("media", (media) => {
    const theme = media.params.match(COLOR_SCHEME_MEDIA)?.[1]?.toLowerCase() as Theme | undefined;
    if (!theme) return;
    media.walkRules((rule) => {
      if (insideKeyframes(rule)) return;
      rule.selectors = rule.selectors.map((selector) => scopeSelector(selector, theme));
      themed.add(rule);
    });
    media.replaceWith(media.nodes ?? []);
  });
  root.walkRules((rule) => {
    if (insideKeyframes(rule) || themed.has(rule)) return;
    rule.selectors = rule.selectors.map((selector) => scopeSelector(selector));
  });
  root.walkDecls((decl) => {
    const prop = decl.prop.toLowerCase();
    const fixed = prop === "position" && /fixed/i.test(decl.value);
    if (UNSAFE_PROPS.has(prop) || UNSAFE_VALUE.test(decl.value) || fixed) decl.remove();
  });

  // A "<" could close the <style> element it is rendered into.
  return root.toString().replace(/</g, "\\3c ");
}
