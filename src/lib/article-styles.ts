import postcss, { type AtRule, type Rule } from "postcss";

/** Class on the article body wrapper that every hand-written CSS rule is scoped under. */
export const ARTICLE_SCOPE_CLASS = "article-custom";

const SCOPE = `.${ARTICLE_SCOPE_CLASS}`;
const ALLOWED_AT_RULES = new Set(["media", "supports", "keyframes", "-webkit-keyframes"]);
// Remote loads (tracking / exfiltration) and legacy script-in-CSS vectors.
const UNSAFE_VALUE = /url\s*\(|image-set\s*\(|expression\s*\(|javascript:|@import/i;
const UNSAFE_PROPS = new Set(["behavior", "-moz-binding"]);
const PAGE_ROOT = /^(?:html\s*)?(?:body|:root|html)\b\s*/i;

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

function scopeSelector(selector: string): string {
  const trimmed = selector.trim();
  if (PAGE_ROOT.test(trimmed)) {
    const rest = trimmed.replace(PAGE_ROOT, "");
    return rest ? `${SCOPE} ${rest}` : SCOPE;
  }
  return `${SCOPE} ${trimmed}`;
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
  root.walkRules((rule) => {
    if (insideKeyframes(rule)) return;
    rule.selectors = rule.selectors.map(scopeSelector);
  });
  root.walkDecls((decl) => {
    const prop = decl.prop.toLowerCase();
    const fixed = prop === "position" && /fixed/i.test(decl.value);
    if (UNSAFE_PROPS.has(prop) || UNSAFE_VALUE.test(decl.value) || fixed) decl.remove();
  });

  // A "<" could close the <style> element it is rendered into.
  return root.toString().replace(/</g, "\\3c ");
}
