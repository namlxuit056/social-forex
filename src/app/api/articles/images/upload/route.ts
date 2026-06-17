import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertImageFile, effectiveImageMime } from "@/lib/signal-images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function blobToken(): string | undefined {
  const raw = process.env.BLOB_READ_WRITE_TOKEN;
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  return t.length > 0 ? t : undefined;
}

// CKEditor upload adapter expects { url: string } on success
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const token = blobToken();
  if (!token) {
    return NextResponse.json({ error: "blob_not_configured" }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  // CKEditor sends the file under the "upload" key
  const raw = formData.get("upload") ?? formData.get("file");
  if (!raw || typeof raw === "string" || (raw as Blob).size === 0) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }

  const file: File =
    raw instanceof File
      ? raw
      : new File([raw as Blob], "upload.jpg", { type: (raw as Blob).type });

  const check = assertImageFile(file);
  if (!check.ok) {
    return NextResponse.json({ error: "validation", message: check.errorKey }, { status: 400 });
  }

  const mime = effectiveImageMime(file) ?? "image/jpeg";
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const path = `article/${session.user.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  try {
    const blob = await put(path, file, {
      access: "public",
      token,
      addRandomSuffix: false,
      contentType: mime,
    });
    return NextResponse.json({ url: blob.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "upload_failed";
    return NextResponse.json({ error: "blob_upload_failed", message }, { status: 502 });
  }
}
