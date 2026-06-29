import { NextResponse } from "next/server";
import { fetchScreenerPairs } from "@/lib/screener/screener-data";

export { type ScreenerPair } from "@/lib/screener/screener-data";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    const pairs = await fetchScreenerPairs();
    return NextResponse.json(pairs);
  } catch {
    return NextResponse.json([]);
  }
}
