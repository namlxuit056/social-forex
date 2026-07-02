import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Bell, Shield } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SiteNavLink } from "@/components/layout/site-nav-link";
import { SiteLogo } from "@/components/layout/site-logo";
import { NavMegaMenu } from "@/components/layout/nav-mega-menu";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import {
  primaryNavKeys,
  marketNavKeys,
  communityNavKeys,
  learningNavKeys,
} from "@/components/layout/nav-config";

const megaMenuGroups = [
  { labelKey: "marketTools", items: marketNavKeys },
  { labelKey: "community", items: communityNavKeys },
  { labelKey: "learning", items: learningNavKeys },
] as const;

export async function SiteHeader() {
  const session = await auth();
  const t = await getTranslations("nav");
  const tc = await getTranslations("common");
  const ta = await getTranslations("admin");

  let isStaff = false;
  let unreadNotifications = 0;
  if (session?.user?.id) {
    const u = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    isStaff = u?.role === "ADMIN" || u?.role === "MOD";
    unreadNotifications = await prisma.notification.count({
      where: { userId: session.user.id, readAt: null },
    });
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
        <nav className="ml-2 hidden items-center gap-1 lg:flex">
          {primaryNavKeys.map((item) => (
            <SiteNavLink
              key={item.href}
              href={item.href}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              activeClassName="bg-primary/10 text-primary ring-1 ring-primary/20"
            >
              <item.icon className="size-3.5" aria-hidden />
              {t(item.key)}
            </SiteNavLink>
          ))}

          <div className="mx-1 h-4 w-px bg-border/60" />

          {megaMenuGroups.map((group) => (
            <NavMegaMenu
              key={group.labelKey}
              labelKey={group.labelKey}
              items={group.items}
            />
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <LanguageSwitcher />

          {session?.user ? (
            <>
              <Link
                href="/notifications"
                className="relative inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label={tc("notificationsBellAria")}
              >
                <Bell className="size-4.5" aria-hidden />
                {unreadNotifications > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.6rem] font-semibold leading-none text-primary-foreground">
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </span>
                ) : null}
              </Link>
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
                  "text-xs",
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
              <span className="hidden lg:inline-flex">
                <SignOutButton />
              </span>
            </>
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="hidden shrink-0 whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground sm:inline-flex sm:px-2.5 sm:text-sm"
              >
                {tc("signIn")}
              </Link>
              <Link
                href="/auth/register"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "hidden shrink-0 text-xs sm:inline-flex",
                )}
              >
                {tc("signUp")}
              </Link>
            </>
          )}

          <MobileNav isStaff={isStaff} isAuthenticated={!!session?.user} />
        </div>
      </div>

      {/* Mobile & tablet: one compact rail for the high-frequency routes. */}
      <div className="border-t border-border/40 bg-muted/25 lg:hidden">
        <nav
          aria-label={t("scrollPrimaryAria")}
          className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {[...primaryNavKeys, ...marketNavKeys].map((item) => (
            <SiteNavLink
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-full bg-muted/90 px-3 py-2 text-xs font-medium text-foreground shadow-sm ring-1 ring-border/50 transition hover:bg-primary/15 hover:text-primary"
              activeClassName="bg-primary/15 text-primary ring-primary/35"
            >
              {t(item.key)}
            </SiteNavLink>
          ))}
        </nav>
      </div>

    </header>
  );
}
