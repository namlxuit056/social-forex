"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

type ErrorKind = "ERROR_BOUNDARY" | "GLOBAL_ERROR" | "UNHANDLED_REJECTION";

function postTrackingEvent(payload: unknown) {
  if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    const blob = new Blob([JSON.stringify(payload)], {
      type: "application/json",
    });
    if (navigator.sendBeacon("/api/analytics/track", blob)) return;
  }

  void fetch("/api/analytics/track", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);
}

function currentFullPath() {
  return `${window.location.pathname}${window.location.search}`;
}

export function trackClientError(
  error: unknown,
  kind: ErrorKind = "GLOBAL_ERROR",
  digest?: string,
) {
  if (typeof window === "undefined") return;

  const normalized =
    error instanceof Error
      ? { message: error.message, stack: error.stack }
      : { message: String(error), stack: undefined };

  postTrackingEvent({
    type: "client_error",
    path: window.location.pathname,
    fullPath: currentFullPath(),
    kind,
    message: normalized.message,
    stack: normalized.stack,
    digest,
  });
}

export function UserActivityTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!pathname || pathname.startsWith("/api/")) return;

    const query = searchParams.toString();
    postTrackingEvent({
      type: "page_view",
      path: pathname,
      fullPath: query ? `${pathname}?${query}` : pathname,
      title: document.title,
      referrer: document.referrer || undefined,
    });
  }, [pathname, searchParams, status]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const onError = (event: ErrorEvent) => {
      trackClientError(event.error ?? event.message, "GLOBAL_ERROR");
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackClientError(event.reason, "UNHANDLED_REJECTION");
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, [status]);

  return null;
}
