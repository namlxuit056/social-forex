import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { clientIp } from "@/lib/client-ip";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const SIGNIN_WINDOW_MS = 15 * 60_000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
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
