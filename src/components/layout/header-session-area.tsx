"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AccountMenu } from "@/components/layout/account-menu";
import { BottomAppNav } from "@/components/layout/bottom-app-nav";
import { MoodCheckinNudge } from "@/components/journal/mood-checkin-nudge";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Session-dependent part of the header. Resolved on the client so the server
 * render of every public page is identical for all visitors and can be cached.
 */
export function HeaderSessionArea() {
  const tc = useTranslations("common");
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  // Keyed by user so a stale answer never leaks across sign-out / account switch.
  const [staff, setStaff] = useState<{ userId: string; isStaff: boolean } | null>(null);
  const isStaff = !!userId && staff?.userId === userId && staff.isStaff;

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : { isStaff: false }))
      .then((d: { isStaff: boolean }) => {
        if (alive) setStaff({ userId, isStaff: Boolean(d.isStaff) });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [userId]);

  const isAuthenticated = status === "authenticated" && !!session?.user;

  return (
    <>
      {status === "loading" ? (
        // Same footprint as the signed-out buttons to keep CLS at 0.
        <span aria-hidden className="hidden h-8 w-36 sm:inline-flex" />
      ) : isAuthenticated ? (
        <>
          <NotificationBell initialCount={0} />
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ size: "sm" }), "hidden text-xs sm:inline-flex")}
          >
            {tc("dashboard")}
          </Link>
          <span className="hidden xl:inline-flex">
            <AccountMenu
              label={session.user?.name ?? session.user?.email ?? ""}
              isStaff={isStaff}
            />
          </span>
        </>
      ) : (
        <>
          <Link
            href="/auth/signin"
            className="hidden shrink-0 whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-item-hover hover:text-foreground sm:inline-flex sm:px-2.5 sm:text-sm"
          >
            {tc("signIn")}
          </Link>
          <Link
            href="/auth/register"
            className={cn(buttonVariants({ size: "sm" }), "hidden shrink-0 text-xs sm:inline-flex")}
          >
            {tc("signUp")}
          </Link>
        </>
      )}

      <MobileNav isStaff={isStaff} isAuthenticated={isAuthenticated} />
    </>
  );
}

/** Signed-in-only floating UI (bottom app nav, mood check-in). */
export function SessionExtras() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  if (!userId) return null;
  return (
    <>
      <BottomAppNav userId={userId} />
      <MoodCheckinNudge />
    </>
  );
}
