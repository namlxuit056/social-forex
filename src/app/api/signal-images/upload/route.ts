import { put } from "@vercel/blob";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { assertImageFile, effectiveImageMime } from "@/lib/signal-images";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "not_configured", message: "BLOB_READ_WRITE_TOKEN chưa cấu hình." },
      { status: 503 },
    );
  }

  const session = await auth();
  let userId = session?.user?.id;
  if (!userId) {
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
    });
    userId = token?.sub ?? undefined;
  }
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { ok } = rateLimit(`sig-img:${userId}`, 20, 60_000);
  if (!ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const raw = formData.get("file");
  if (!raw || typeof raw === "string" || !(raw instanceof Blob) || raw.size === 0) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }

  const file: File =
    raw instanceof File
      ? raw
      : new File([raw], "upload.jpg", {
          type: (raw as Blob).type || "",
        });

  const check = assertImageFile(file);
  if (!check.ok) {
    return NextResponse.json({ error: "validation", message: check.error }, { status: 400 });
  }

  const mime = effectiveImageMime(file) ?? "image/jpeg";
  const ext =
    mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";

  const path = `signals/${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const blob = await put(path, file, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
  });

  return NextResponse.json({ url: blob.url });
}
