import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchArticleImage } from "@/lib/ai/article-images";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") return Response.json({ error: "forbidden" }, { status: 403 });

  const keyword = req.nextUrl.searchParams.get("keyword")?.trim();
  if (!keyword || keyword.length < 2) {
    return Response.json({ error: "missing_keyword" }, { status: 400 });
  }

  const image = await fetchArticleImage(keyword);
  if (!image) return Response.json({ error: "not_found" }, { status: 404 });

  return Response.json(image);
}
