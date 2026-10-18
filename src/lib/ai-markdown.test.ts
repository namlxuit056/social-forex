import { describe, expect, it } from "vitest";
import { renderAiMarkdown } from "./ai-markdown";

describe("renderAiMarkdown", () => {
  it("keeps markdown formatting", () => {
    const html = renderAiMarkdown("**Entry** 2350\n\n- SL 2340\n- [chart](https://toolforex.xyz/chart)");
    expect(html).toContain("<strong>Entry</strong>");
    expect(html).toContain("<li>SL 2340</li>");
    expect(html).toContain('href="https://toolforex.xyz/chart"');
  });

  it("neutralises raw HTML and script links", () => {
    const html = renderAiMarkdown('<img src=x onerror="alert(1)"> <script>alert(1)</script> [x](javascript:alert(1))');
    expect(html).not.toMatch(/<img|<script|javascript:/i);
  });
});
