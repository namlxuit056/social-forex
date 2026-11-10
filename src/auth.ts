import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { clientIp } from "@/lib/client-ip";
import {
  OAUTH_SIGNUP_COOKIE,
  isGoogleAuthEnabled,
  parseOAuthSignupCookie,
} from "@/lib/google-auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { generateReferralCode } from "@/lib/referral";

const SIGNIN_WINDOW_MS = 15 * 60_000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    // Reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET. Google only returns verified
    // emails, so an existing email/password account with the same address is
    // linked instead of rejected.
    ...(isGoogleAuthEnabled() ? [Google({ allowDangerousEmailAccountLinking: true })] : []),
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mật khẩu", type: "password" },
      },
      authorize: async (credentials, request) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }
        // Slow down password guessing: per account and per client IP.
        const ip = request instanceof Request ? clientIp(request.headers) : "unknown";
        if (
          !rateLimit(`signin:email:${email.toLowerCase()}`, 10, SIGNIN_WINDOW_MS).ok ||
          !rateLimit(`signin:ip:${ip}`, 30, SIGNIN_WINDOW_MS).ok
        ) {
          return null;
        }
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        if (!user.emailVerified) return null;
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;
        return {
          id: user.id,
          email: user.email ?? undefined,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        };
      },
    }),
  ],
  events: {
    // First Google sign-in creates the user: give it what /api/auth/register would.
    async createUser({ user }) {
      if (!user.id) return;
      const jar = await cookies();
      const { ref, locale } = parseOAuthSignupCookie(jar.get(OAUTH_SIGNUP_COOKIE)?.value);
      const referrer = ref
        ? await prisma.user.findUnique({ where: { referralCode: ref.toUpperCase() }, select: { id: true } })
        : null;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          referralCode: generateReferralCode(),
          referredById: referrer?.id ?? null,
          ...(locale ? { locale } : {}),
        },
      });
      jar.delete(OAUTH_SIGNUP_COOKIE);
    },
    // Google vouches for the address, so a linked account counts as verified.
    async linkAccount({ user, account }) {
      if (account.provider !== "google" || !user.id) return;
      await prisma.user.updateMany({
        where: { id: user.id, emailVerified: null },
        data: { emailVerified: new Date() },
      });
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
