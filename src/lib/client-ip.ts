/**
 * Client IP for rate-limit keys. Cloudflare sets CF-Connecting-IP; the first
 * X-Forwarded-For entries are client-controlled, so only the last (added by
 * our proxy) is trusted.
 */
export function clientIp(headers: Headers): string {
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const xff = headers.get("x-forwarded-for");
  const last = xff?.split(",").pop()?.trim();
  return last || "unknown";
}
