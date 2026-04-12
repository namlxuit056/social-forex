import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Shield } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SiteLogo } from "@/components/layout/site-logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

const primaryNavKeys = [
  { href: "/quotes", key: "quotes" },
  { href: "/calendar", key: "calendar" },
  { href: "/chart", key: "chart" },
  { href: "/tools", key: "tools" },
  { href: "/signals", key: "signals" },
  { href: "/forum", key: "forum" },
] as const;

const secondaryNavKeys = [
  { href: "/heatmap", key: "heatmap" },
  { href: "/sentiment", key: "sentiment" },
  { href: "/leaderboard", key: "leaderboard" },
  { href: "/journal", key: "journal" },
  { href: "/backtest", key: "backtest" },
  { href: "/academy", key: "academy" },
  { href: "/webinar", key: "webinar" },
  { href: "/resources", key: "resources" },
  { href: "/brokers", key: "brokers" },
  { href: "/messages", key: "messages" },
  { href: "/partners", key: "partners" },
  { href: "/forum/search", key: "searchTopics" },
] as const;

export async function SiteHeader() {
  const session = await auth();
  const t = await getTranslations("nav");
  const tc = await getTranslations("common");
  const ta = await getTranslations("admin");

  let isStaff = false;
  if (session?.user?.id) {
    const u = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    isStaff = u?.role === "ADMIN" || u?.role === "MOD";
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      {/* Main bar */}
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5">
        {/* Logo + Brand */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <SiteLogo />
          <span className="text-base font-bold tracking-tight text-foreground">
            Social<span className="text-primary">Forex</span>
          </span>
        </Link>

        {/* Desktop primary nav */}
        <nav className="ml-2 hidden items-center gap-0.5 lg:flex">
          {primaryNavKeys.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          <LanguageSwitcher />

          {session?.user ? (
            <>
              <Link
                href="/profile"
                className="hidden rounded-md px-2 py-1 text-sm text-foreground/80 transition hover:bg-muted hover:text-foreground sm:inline-flex"
              >
                {session.user.name ?? session.user.email}
              </Link>
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "h-8 text-xs",
                )}
              >
                {tc("dashboard")}
              </Link>
              {isStaff && (
                <Link
                  href="/admin"
                  className="hidden items-center gap-1 rounded-md px-2 py-1 text-xs text-yellow-600 transition hover:bg-yellow-500/10 dark:text-yellow-500 sm:inline-flex"
                >
                  <Shield className="size-3" />
                  {ta("dashboard")}
                </Link>
              )}
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="hidden rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground sm:inline-flex"
              >
                {tc("signIn")}
              </Link>
              <Link
                href="/auth/register"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "h-8 text-xs",
                )}
              >
                {tc("signUp")}
              </Link>
            </>
          )}

          <MobileNav />
        </div>
      </div>

      {/* Desktop secondary nav */}
      <div className="hidden border-t border-border/40 bg-muted/30 lg:block">
        <div className="mx-auto flex max-w-7xl items-center gap-0.5 px-4 py-1">
          {secondaryNavKeys.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded px-2 py-0.5 text-xs text-muted-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
            >
              {t(item.key)}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
