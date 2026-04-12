import { NextResponse } from "next/server";
import { resolveQuotes } from "@/lib/quotes/resolve-quotes";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await resolveQuotes();
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json(
      { error: message, updatedAt: new Date().toISOString(), quotes: [] },
      { status: 500 },
    );
  }
}
