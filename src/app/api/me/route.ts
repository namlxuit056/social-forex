import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Per-user header data. Kept out of the shared layout so public pages stay
 * cacheable (ISR/CDN) — the header fetches this client-side after hydration.
 */
export async function GET() {
  const session = await auth();
  const headers = { "cache-control": "private, no-store" };
  if (!session?.user?.id) {
    return NextResponse.json({ isStaff: false }, { headers });
  }
  const u = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  return NextResponse.json(
    { isStaff: u?.role === "ADMIN" || u?.role === "MOD" },
    { headers },
  );
}
