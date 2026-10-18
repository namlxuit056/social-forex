import { describe, expect, it } from "vitest";
import { sanitizeContentHtml } from "./safe-html";

describe("sanitizeContentHtml", () => {
  it("removes scripts, handlers and javascript: links", () => {
    const out = sanitizeContentHtml(
      '<p onclick="x()">hi</p><script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">l</a>',
    );
    expect(out).not.toMatch(/script|onerror|onclick|javascript:/i);
    expect(out).toContain("<p>hi</p>");
  });

  it("keeps the formatting articles and lessons use", () => {
    const html =
      '<h2>T</h2><figure><img src="https://a.b/c.png" alt="c" width="10" height="10" /><figcaption>c</figcaption></figure>' +
      '<table><thead><tr><th>a</th></tr></thead><tbody><tr><td>b</td></tr></tbody></table>' +
      '<ul><li data-list-item-id="1"><input type="checkbox" checked disabled /> done</li></ul>' +
      '<p style="text-align: center">x</p><a href="https://x.y" target="_blank" rel="noopener">x</a>';
    const out = sanitizeContentHtml(html);
    for (const part of ["<figure>", "<figcaption>", "<table>", "<td>", 'type="checkbox"', "text-align:center", 'href="https://x.y"', 'data-list-item-id="1"']) {
      expect(out).toContain(part);
    }
  });
});
