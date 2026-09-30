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
  if (host.startsWith("www.")) {
    const url = request.nextUrl.clone();
    url.host = host.slice(4);
    // Self-hosted behind a tunnel, nextUrl carries the internal port (3000).
    url.port = "";
    return NextResponse.redirect(url, 308);
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
