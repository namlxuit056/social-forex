import { NextResponse } from "next/server";
import { buildQuotes } from "@/lib/quotes/mock";

export async function GET() {
  const tick = Math.floor(Date.now() / 3000);
  const quotes = buildQuotes(tick);
  return NextResponse.json({ updatedAt: new Date().toISOString(), quotes });
}
