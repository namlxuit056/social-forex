"use client";

import { ChevronDown, LayoutDashboard, LogOut, Shield, UserRound } from "lucide-react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(label: string) {
  const parts = label.trim().split(/[\s@._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").concat(parts[1]?.[0] ?? "").toUpperCase();
}

/**
 * Signed-in account controls in one menu so the desktop header fits at
 * 1024–1280px: profile, dashboard, admin (staff only) and sign out.
 */
export function AccountMenu({ label, isStaff }: { label: string; isStaff: boolean }) {
  const tc = useTranslations("common");
  const ta = useTranslations("admin");
  const itemClass = "min-h-9 text-sm";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        className="inline-flex h-9 items-center gap-2 rounded-lg px-1.5 text-sm text-foreground transition-colors hover:bg-muted"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
          {initials(label)}
        </span>
        <span className="hidden max-w-28 truncate 2xl:inline">{label}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-52">
        <p className="truncate px-2.5 py-1.5 text-xs text-muted-foreground">{label}</p>
        <DropdownMenuItem className={itemClass} render={<Link href="/profile" />}>
          <UserRound className="size-4" aria-hidden />
          {tc("profile")}
        </DropdownMenuItem>
        <DropdownMenuItem className={itemClass} render={<Link href="/dashboard" />}>
          <LayoutDashboard className="size-4" aria-hidden />
          {tc("dashboard")}
        </DropdownMenuItem>
        {isStaff ? (
          <DropdownMenuItem className={itemClass} render={<Link href="/admin" />}>
            <Shield className="size-4" aria-hidden />
            {ta("dashboard")}
          </DropdownMenuItem>
        ) : null}
        <div className="my-1 h-px bg-border" role="separator" />
        <DropdownMenuItem
          className={`${itemClass} text-danger data-highlighted:bg-danger-bg data-highlighted:text-danger`}
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="size-4" aria-hidden />
          {tc("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
