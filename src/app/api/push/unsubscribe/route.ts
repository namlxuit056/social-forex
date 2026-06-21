import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { unsubscribePush } from "@/lib/push";

export const runtime = "nodejs";

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = unsubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
  }

  await unsubscribePush(parsed.data.endpoint);
  return NextResponse.json({ ok: true });
}
