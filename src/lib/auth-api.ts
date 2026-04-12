import { getToken } from "next-auth/jwt";
import type { Session } from "next-auth";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

/** Dùng chung cho Route Handler — tránh lệch cookie dev vs HTTPS production. */
export function authSecretForJwt(): string | undefined {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
}

/** Trên Vercel / HTTPS, session cookie dùng tiền tố __Secure- — getToken cần secureCookie: true. */
function preferSecureSessionCookie(req: NextRequest): boolean {
  if (process.env.VERCEL) return true;
  const raw = req.headers.get("x-forwarded-proto");
  const proto = raw?.split(",")[0]?.trim().toLowerCase();
  if (proto === "https") return true;
  try {
    return new URL(req.url).protocol === "https:";
  } catch {
    return process.env.NODE_ENV === "production";
  }
}

/**
 * Lấy user id cho API route: auth(NextRequest) → auth() (headers Next) → getToken (thử cả secure / không secure).
 */
export async function getSessionUserIdForApi(req: NextRequest): Promise<string | undefined> {
  const authWithReq = auth as (r: NextRequest) => Promise<Session | null>;

  const s1 = await authWithReq(req);
  let id = s1?.user?.id;
  if (id) return id;

  const s2 = await auth();
  id = s2?.user?.id;
  if (id) return id;

  const secret = authSecretForJwt();
  if (!secret) return undefined;

  const secureFirst = preferSecureSessionCookie(req);
  const order = secureFirst
    ? ([true, false] as const)
    : ([false, true] as const);

  for (const secureCookie of order) {
    const jwt = await getToken({ req, secret, secureCookie });
    if (jwt?.sub) return jwt.sub;
  }

  return undefined;
}
