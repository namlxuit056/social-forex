import { describe, expect, it } from "vitest";
import { isVercelBlobUrl } from "./vercel-blob-delete";

describe("isVercelBlobUrl", () => {
  it("accepts Vercel Blob public URLs", () => {
    expect(
      isVercelBlobUrl(
        "https://abc123.public.blob.vercel-storage.com/signal/u1/x.jpg",
      ),
    ).toBe(true);
  });
  it("rejects other hosts", () => {
    expect(isVercelBlobUrl("https://example.com/a.jpg")).toBe(false);
    expect(isVercelBlobUrl("")).toBe(false);
  });
});
