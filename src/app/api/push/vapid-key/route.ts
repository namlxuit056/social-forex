import { NextResponse } from "next/server";
import { getVapidPublicKey, isPushEnabled } from "@/lib/push";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  if (!isPushEnabled()) {
    return NextResponse.json({ enabled: false });
  }
  return NextResponse.json({ enabled: true, publicKey: getVapidPublicKey() });
}
