import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";

const MAX_PATH = 512;
const MAX_FULL_PATH = 1000;
const MAX_MESSAGE = 1000;
const MAX_STACK = 4000;
const MAX_TITLE = 256;
const MAX_REFERRER = 1000;
const MAX_EVENT_NAME = 80;
const MAX_PROPERTY = 200;
const MAX_VISITOR_ID = 80;

const FUNNEL_EVENT_NAMES = new Set<string>(Object.values(ANALYTICS_EVENTS));
const FUNNEL_PROPERTY_KEYS = [
  "surface",
  "cta",
  "destination",
  "reason",
  "locale",
] as const;

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

function normalizeEventName(value: unknown) {
  const eventName = truncate(value, MAX_EVENT_NAME);
  if (!eventName || !FUNNEL_EVENT_NAMES.has(eventName)) return null;
  return eventName;
}

function normalizeVisitorId(value: unknown) {
  const visitorId = truncate(value, MAX_VISITOR_ID);
  if (!visitorId || !/^[A-Za-z0-9_-]{8,80}$/.test(visitorId)) return undefined;
  return visitorId;
}

function normalizeProperty(value: unknown) {
  if (typeof value === "string") return value.slice(0, MAX_PROPERTY);
  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return value;
  }
  return undefined;
}

function pickFunnelProperties(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const input = raw as Record<string, unknown>;
  const output: Record<string, string | number | boolean | null> = {};

  for (const key of FUNNEL_PROPERTY_KEYS) {
    const value = normalizeProperty(input[key]);
    if (value !== undefined) output[key] = value;
  }

  return output;
}

export async function POST(req: NextRequest) {
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

  const session = await auth();
  const userAgent = truncate(req.headers.get("user-agent"), 1000);

  if (body.type === "funnel_event") {
    const eventName = normalizeEventName(body.eventName);
    if (!eventName) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const properties = pickFunnelProperties(body.properties);

    await prisma.funnelEvent.create({
      data: {
        eventName,
        visitorId: normalizeVisitorId(body.visitorId),
        userId: session?.user?.id,
        path,
        fullPath: truncate(body.fullPath, MAX_FULL_PATH),
        locale:
          typeof properties.locale === "string" ? properties.locale : undefined,
        surface:
          typeof properties.surface === "string" ? properties.surface : undefined,
        cta: typeof properties.cta === "string" ? properties.cta : undefined,
        destination:
          typeof properties.destination === "string"
            ? properties.destination
            : undefined,
        reason:
          typeof properties.reason === "string" ? properties.reason : undefined,
        properties,
        referrer: truncate(body.referrer, MAX_REFERRER),
        userAgent,
      },
    });

    return NextResponse.json({ ok: true });
  }

  if (!session?.user?.id) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

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
