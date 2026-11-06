import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

/**
 * Canonicalize the host to the apex domain (no `www.`) before running the
 * locale middleware. Without this, Google crawls and indexes both
 * `www.toolforex.xyz` and `toolforex.xyz` as separate duplicate pages
 * (GSC: "Duplicate, Google chose different canonical than user").
 */
export default function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  // Behind Cloudflare Tunnel the origin always sees plain http; the visitor's
  // scheme arrives in x-forwarded-proto. Without this, http:// serves a 200
  // duplicate of every page instead of redirecting.
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
  const isPlainHttp = !isLocal && request.headers.get("x-forwarded-proto") === "http";
  if (host.startsWith("www.") || isPlainHttp) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = host.startsWith("www.") ? host.slice(4) : host;
    // Self-hosted behind a tunnel, nextUrl carries the internal port (3000).
    url.port = "";
    return NextResponse.redirect(url, isPlainHttp ? 301 : 308);
  }
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/",
    "/(vi|en)/:path*",
    "/((?!api|_next|_vercel|icon|apple-icon|favicon\\.ico|sitemap|robots|.*\\..*).*)",
  ],
};
