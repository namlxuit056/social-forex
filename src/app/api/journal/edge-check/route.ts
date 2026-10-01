import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getEdgeCheck } from "@/lib/journal/edge-check-query";

export const dynamic = "force-dynamic";

/**
 * Win rate của chính trader trong bối cảnh lệnh sắp vào (cặp / hướng / phiên / thứ)
 * so với mức chung — dùng cho gợi ý mềm ngay lúc đặt lệnh. `time=0` bỏ phiên/thứ
 * (form journal có thể đang log một lệnh đã vào từ trước).
 */
export async function GET(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json(null);

  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") ?? "").trim().toUpperCase().slice(0, 20);
  const direction = (searchParams.get("direction") ?? "").trim().toUpperCase().slice(0, 20);
  if (symbol.length < 3) return NextResponse.json(null);

  const result = await getEdgeCheck(session.user.id, {
    symbol,
    direction,
    at: searchParams.get("time") === "0" ? null : new Date(),
  });
  return NextResponse.json(result);
}
