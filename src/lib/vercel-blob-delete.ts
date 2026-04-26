import { del } from "@vercel/blob";

/** @internal exported for unit tests */
export function isVercelBlobUrl(url: string): boolean {
  if (!url.startsWith("https://") && !url.startsWith("http://")) {
    return false;
  }
  try {
    return new URL(url).hostname.endsWith("blob.vercel-storage.com");
  } catch {
    return false;
  }
}

function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

/**
 * Best-effort delete of objects on Vercel Blob. Skips when
 * BLOB_READ_WRITE_TOKEN is missing. Only full URLs to *.blob.vercel-storage.com
 * (as returned by `put` on upload). Failures (e.g. 404) are ignored per URL.
 */
export async function deleteVercelBlobUrls(urls: readonly string[]): Promise<void> {
  if (!hasBlobToken() || urls.length === 0) {
    return;
  }
  const unique = [...new Set(urls.filter(isVercelBlobUrl))];
  if (unique.length === 0) {
    return;
  }
  await Promise.allSettled(
    unique.map((url) => del(url).catch(() => undefined)),
  );
}
