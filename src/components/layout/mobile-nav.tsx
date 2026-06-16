"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Bell,
  BookOpen,
  Menu,
  MessageSquare,
  Shield,
  Wrench,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

const marketNavKeys = [
  { href: "/quotes", key: "quotes" },
  { href: "/calendar", key: "calendar" },
  { href: "/chart", key: "chart" },
  { href: "/tools", key: "tools" },
  { href: "/heatmap", key: "heatmap" },
  { href: "/sentiment", key: "sentiment" },
] as const;

const communityNavKeys = [
  { href: "/leaderboard", key: "leaderboard" },
  { href: "/plan", key: "plan" },
  { href: "/journal", key: "journal" },
  { href: "/mt5", key: "mt5" },
  { href: "/backtest", key: "backtest" },
  { href: "/messages", key: "messages" },
  { href: "/forum/search", key: "searchTopics" },
] as const;

const learningNavKeys = [
  { href: "/articles", key: "articles" },
  { href: "/challenge", key: "challenge" },
  { href: "/start", key: "startHere" },
  { href: "/webinar", key: "webinar" },
  { href: "/resources", key: "resources" },
  { href: "/brokers", key: "brokers" },
  { href: "/partners", key: "partners" },
] as const;

const navGroups = [
  { labelKey: "marketTools", icon: Wrench, items: marketNavKeys },
  { labelKey: "community", icon: MessageSquare, items: communityNavKeys },
  { labelKey: "learning", icon: BookOpen, items: learningNavKeys },
] as const;

export function MobileNav({
  isStaff,
  isAuthenticated,
}: {
  isStaff: boolean;
  isAuthenticated: boolean;
}) {
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
        aria-label={tc("menuAria")}
      >
        {open ? <X className="size-4" /> : <Menu className="size-4" />}
      </Button>

      {open && (
        <div className="absolute inset-x-0 top-full z-50 max-h-[80dvh] overflow-y-auto border-b border-border bg-background/95 backdrop-blur-lg">
          <div className="mx-auto max-w-7xl px-4 py-3">

            {/* Nav sections */}
            <div className="space-y-4">
              {navGroups.map((group) => (
                <div key={group.labelKey}>
                  <div className="mb-1 flex items-center gap-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <group.icon className="size-3.5" aria-hidden />
                    {tn(group.labelKey)}
                  </div>
                  <div className="grid grid-cols-2 gap-0.5">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="rounded-md px-2 py-2 text-sm text-foreground transition hover:bg-muted"
                      >
                        {tn(item.key)}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Account section */}
            <div className="mt-4 border-t border-border/50 pt-3">
              {isAuthenticated ? (
                <div className="flex flex-col gap-1">
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
              ) : (
                <div className="flex gap-2">
                  <Link
                    href="/auth/signin"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-md px-3 py-2 text-center text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    {tc("signIn")}
                  </Link>
                  <Link
                    href="/auth/register"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                  >
                    {tc("signUp")}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
