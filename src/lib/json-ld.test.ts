import { describe, expect, it } from "vitest";
import { buildItemListJsonLd, jsonLdHtml } from "./json-ld";

describe("jsonLdHtml", () => {
  it("cannot close the surrounding script tag", () => {
    const html = jsonLdHtml({ name: "</script><script>alert(1)</script>" });
    expect(html).not.toContain("<");
    expect(JSON.parse(html)).toEqual({ name: "</script><script>alert(1)</script>" });
  });
});

describe("buildItemListJsonLd", () => {
  it("numbers items from 1 and keeps their order", () => {
    const ld = buildItemListJsonLd("Academy", [
      { name: "A", url: "https://x.test/a" },
      { name: "B", url: "https://x.test/b" },
    ]);
    expect(ld["@type"]).toBe("ItemList");
    expect(ld.numberOfItems).toBe(2);
    expect(ld.itemListElement.map((i) => [i.position, i.name, i.url])).toEqual([
      [1, "A", "https://x.test/a"],
      [2, "B", "https://x.test/b"],
    ]);
  });

  it("handles an empty list", () => {
    const ld = buildItemListJsonLd("Empty", []);
    expect(ld.numberOfItems).toBe(0);
    expect(ld.itemListElement).toEqual([]);
  });
});
