import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUserIdForApi } from "@/lib/auth-api";
import { assertImageFile, effectiveImageMime } from "@/lib/signal-images";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

function blobToken(): string | undefined {
  const raw = process.env.BLOB_READ_WRITE_TOKEN;
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  return t.length > 0 ? t : undefined;
}

/** Prefix object trong store (vd: signal → signal/{userId}/file.jpg). Mặc định khớp thư mục signal/ trên Blob. */
function blobUploadPrefix(): string {
  let p = (process.env.BLOB_UPLOAD_PREFIX ?? "signal").trim();
  p = p.replace(/^\/+|\/+$/g, "");
  if (!p || p.includes("..")) return "signal";
  return p;
}

export async function POST(req: NextRequest) {
  const token = blobToken();
  if (!token) {
    return NextResponse.json(
      { error: "not_configured", message: "BLOB_READ_WRITE_TOKEN chưa cấu hình hoặc đang rỗng." },
      { status: 503 },
    );
  }

  const userId = await getSessionUserIdForApi(req);
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

  const prefix = blobUploadPrefix();
  const path = `${prefix}/${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  try {
    const blob = await put(path, file, {
      access: "public",
      token,
      addRandomSuffix: false,
      contentType: mime,
    });

    return NextResponse.json({ url: blob.url });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Không thể ghi lên Vercel Blob.";
    return NextResponse.json(
      { error: "blob_upload_failed", message },
      { status: 502 },
    );
  }
}
