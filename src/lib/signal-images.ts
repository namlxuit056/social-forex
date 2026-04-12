/** Public URL từ Vercel Blob (có thể là *.public.blob… hoặc biến thể *.blob.vercel-storage.com) */
function isVercelBlobHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h.endsWith(".public.blob.vercel-storage.com") ||
    h.endsWith(".blob.vercel-storage.com")
  );
}

const MAX_IMAGES = 3;
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/** iOS / một số trình duyệt để `file.type` rỗng — suy luận từ tên file */
export function effectiveImageMime(file: Pick<File, "type" | "name">): string | null {
  if (ALLOWED_TYPES.has(file.type)) return file.type;
  const n = file.name.toLowerCase();
  if (/\.jpe?g$/i.test(n)) return "image/jpeg";
  if (/\.png$/i.test(n)) return "image/png";
  if (/\.webp$/i.test(n)) return "image/webp";
  return null;
}

export function isAllowedSignalImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return isVercelBlobHost(u.hostname);
  } catch {
    return false;
  }
}

export type SignalImageErrorKey =
  | "signalImageUrlInvalid"
  | "signalImageTypeInvalid"
  | "signalImageTooLarge";

export function parseAndValidateImageUrls(
  values: unknown[],
):
  | { ok: true; urls: string[] }
  | { ok: false; errorKey: SignalImageErrorKey } {
  const urls = values
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .slice(0, MAX_IMAGES);

  for (const url of urls) {
    if (!isAllowedSignalImageUrl(url)) {
      return { ok: false, errorKey: "signalImageUrlInvalid" };
    }
  }
  return { ok: true, urls };
}

export function assertImageFile(
  file: File,
): { ok: true } | { ok: false; errorKey: SignalImageErrorKey } {
  const mime = effectiveImageMime(file);
  if (!mime) {
    return { ok: false, errorKey: "signalImageTypeInvalid" };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, errorKey: "signalImageTooLarge" };
  }
  return { ok: true };
}

export const SIGNAL_IMAGE_LIMITS = { MAX_IMAGES, MAX_BYTES, ALLOWED_TYPES };
