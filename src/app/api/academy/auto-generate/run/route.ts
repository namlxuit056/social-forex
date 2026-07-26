import type { NextRequest } from "next/server";
import { runAcademyAutoGenerate } from "@/lib/ai/academy-auto-generate";

export const dynamic = "force-dynamic";

const LESSONS_PER_RUN = 3;

function authorized(req: NextRequest) {
  const expected = process.env.CRON_SECRET || process.env.ADMIN_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === expected || req.nextUrl.searchParams.get("secret") === expected;
}

// Vercel Cron calls GET daily — generates topic ideas then publishes a lesson for each.
export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const result = await runAcademyAutoGenerate(LESSONS_PER_RUN);
  return Response.json(result);
}
