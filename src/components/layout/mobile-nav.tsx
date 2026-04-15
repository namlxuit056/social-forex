"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Bell, Menu, Shield, X } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

/**
 * Chỉ hiện từ `lg` trở xuống. Danh sách trang chính nằm dưới header (cuộn ngang).
 * Menu này chỉ còn lối tắt tài khoản (Profile, Dashboard, Admin, đăng xuất).
 */
export function MobileNav({ isStaff }: { isStaff: boolean }) {
  const [open, setOpen] = useState(false);
  const tc = useTranslations("common");
  const ta = useTranslations("admin");
  const tn = useTranslations("nav");

  return (
    <div className="lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={() => setOpen((v) => !v)}
        aria-label={tc("accountMenuAria")}
      >
        {open ? <X className="size-4" /> : <Menu className="size-4" />}
      </Button>

      {open && (
        <div className="absolute inset-x-0 top-full z-50 border-b border-border bg-background/95 backdrop-blur-lg">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              <Bell className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              {tn("notifications")}
            </Link>
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              {tc("profile")}
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              {tc("dashboard")}
            </Link>
            {isStaff ? (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-yellow-600 transition hover:bg-yellow-500/10 dark:text-yellow-500"
              >
                <Shield className="size-4 shrink-0" aria-hidden />
                {ta("dashboard")}
              </Link>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-1 w-full justify-center"
              onClick={() => {
                setOpen(false);
                void signOut({ callbackUrl: "/" });
              }}
            >
              {tc("signOut")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
