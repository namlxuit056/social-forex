import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMt5AccountSnapshot } from "@/lib/mt5/account-snapshot";

export type { LivePendingOrder, Mt5AccountResponse } from "@/lib/mt5/account-snapshot";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await getMt5AccountSnapshot(session.user.id);
  if (!body) {
    return NextResponse.json({ error: "no_connection" }, { status: 404 });
  }

  return NextResponse.json(body);
}
