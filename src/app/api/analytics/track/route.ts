import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MAX_PATH = 512;
const MAX_FULL_PATH = 1000;
const MAX_MESSAGE = 1000;
const MAX_STACK = 4000;
const MAX_TITLE = 256;
const MAX_REFERRER = 1000;

function truncate(value: unknown, max: number) {
  if (typeof value !== "string") return undefined;
  return value.slice(0, max);
}

function normalizePath(value: unknown) {
  const path = truncate(value, MAX_PATH);
  if (!path || !path.startsWith("/") || path.startsWith("/api/")) return null;
  if (path.startsWith("/_next/") || path.includes("..")) return null;
  return path;
}

function normalizeKind(value: unknown) {
  if (
    value === "ERROR_BOUNDARY" ||
    value === "GLOBAL_ERROR" ||
    value === "UNHANDLED_REJECTION"
  ) {
    return value;
  }
  return "GLOBAL_ERROR";
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const path = normalizePath(body.path);
  if (!path) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const userAgent = truncate(req.headers.get("user-agent"), 1000);

  if (body.type === "page_view") {
    await prisma.userPageVisit.create({
      data: {
        userId: session.user.id,
        path,
        fullPath: truncate(body.fullPath, MAX_FULL_PATH) ?? path,
        title: truncate(body.title, MAX_TITLE),
        referrer: truncate(body.referrer, MAX_REFERRER),
        userAgent,
      },
    });

    return NextResponse.json({ ok: true });
  }

  if (body.type === "client_error") {
    const message = truncate(body.message, MAX_MESSAGE);
    if (!message) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    await prisma.userClientError.create({
      data: {
        userId: session.user.id,
        path,
        fullPath: truncate(body.fullPath, MAX_FULL_PATH),
        kind: normalizeKind(body.kind),
        message,
        stack: truncate(body.stack, MAX_STACK),
        digest: truncate(body.digest, 128),
        userAgent,
      },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false }, { status: 400 });
}
