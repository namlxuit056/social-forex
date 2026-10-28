import { describe, expect, it } from "vitest";
import { scopeArticleCss, splitArticleHtml, unescapePastedHtml } from "./article-styles";

describe("splitArticleHtml", () => {
  it("keeps only the body of a pasted full page and collects its styles", () => {
    const { html, css } = splitArticleHtml(
      "<!DOCTYPE html><html><head><title>T</title><style>.a{color:red}</style></head><body><p>Hi</p></body></html>",
    );
    expect(html).toBe("<p>Hi</p>");
    expect(css).toBe(".a{color:red}");
  });

  it("leaves a plain fragment unchanged", () => {
    expect(splitArticleHtml("<h2>X</h2><p>y</p>")).toEqual({ html: "<h2>X</h2><p>y</p>", css: "" });
  });

  it("drops head content when there is no body tag", () => {
    const { html } = splitArticleHtml("<head><title>Leak</title></head><p>ok</p>");
    expect(html).toBe("<p>ok</p>");
  });
});

describe("scopeArticleCss", () => {
  it("maps page-level selectors onto the wrapper and prefixes the rest", () => {
    const out = scopeArticleCss(":root{--g:#f0b429} body{padding:16px} *{margin:0} .card h2, p{color:var(--g)}");
    expect(out).toContain(".article-custom{--g:#f0b429}");
    expect(out).toContain(".article-custom{padding:16px}");
    expect(out).toContain(".article-custom *{margin:0}");
    expect(out).toContain(".article-custom .card h2, .article-custom p{color:var(--g)}");
  });

  it("scopes rules inside @media but not keyframe steps", () => {
    const out = scopeArticleCss("@media(max-width:480px){.stats{gap:4px}} @keyframes f{from{opacity:0}to{opacity:1}}");
    expect(out).toContain(".article-custom .stats{gap:4px}");
    expect(out).toContain("from{opacity:0}");
  });

  it("removes remote loads, fixed positioning and @import", () => {
    const out = scopeArticleCss(
      "@import url(x.css); .a{background:url(https://t.example/p.gif);color:red} .b{position:fixed;top:0}",
    );
    expect(out).not.toMatch(/import|url\(|fixed/);
    expect(out).toContain("color:red");
  });

  it("cannot close the style element it is rendered into", () => {
    expect(scopeArticleCss('.a::after{content:"</style><script>"}')).not.toContain("</style");
  });

  it("returns an empty string for unparseable CSS", () => {
    expect(scopeArticleCss(".a{color:red")).toBe("");
  });
});

describe("unescapePastedHtml", () => {
  it("restores HTML source that was pasted into the visual editor", () => {
    expect(
      unescapePastedHtml("<p>&lt;style&gt;<br>a{b:c}<br>&lt;/style&gt;<br>&lt;div class=\"x\"&gt;A &amp;amp; B&lt;/div&gt;</p>"),
    ).toBe('<style>\na{b:c}\n</style>\n<div class="x">A &amp; B</div>');
  });

  it("leaves real HTML and plain prose unchanged", () => {
    expect(unescapePastedHtml("<h2>X</h2><p>&lt;b&gt;</p>")).toBe("<h2>X</h2><p>&lt;b&gt;</p>");
    expect(unescapePastedHtml("<p>1 &lt; 2</p>")).toBe("<p>1 &lt; 2</p>");
  });
});

describe("splitArticleHtml head tags without <head>", () => {
  it("drops title, meta and link tags", () => {
    const { html } = splitArticleHtml('<title>T</title><meta name="a"><link rel="x" href="y"><div>ok</div>');
    expect(html).toBe("<div>ok</div>");
  });
});
