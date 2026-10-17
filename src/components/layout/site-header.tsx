import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AccountMenu } from "@/components/layout/account-menu";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SiteNavLink } from "@/components/layout/site-nav-link";
import { SiteLogo } from "@/components/layout/site-logo";
import { NavMegaMenu } from "@/components/layout/nav-mega-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
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
    <header className="sticky top-0 z-40 border-b border-border bg-background">
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
        <nav className="ml-2 hidden items-center gap-1 xl:flex">
          {primaryNavKeys.map((item) => (
            <SiteNavLink
              key={item.href}
              href={item.href}
              className="inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-item-hover hover:text-foreground"
              activeClassName="bg-muted text-foreground"
            >
              <item.icon className="size-3.5" aria-hidden />
              {t(item.key)}
            </SiteNavLink>
          ))}

          <div className="mx-1 h-4 w-px bg-border" />

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
              <NotificationBell initialCount={unreadNotifications} />
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "hidden text-xs sm:inline-flex",
                )}
              >
                {tc("dashboard")}
              </Link>
              <span className="hidden xl:inline-flex">
                <AccountMenu
                  label={session.user.name ?? session.user.email ?? ""}
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
      <div className="border-t border-border xl:hidden">
        <nav
          aria-label={t("scrollPrimaryAria")}
          className="scrollbar-clean flex gap-1 overflow-x-auto px-4 py-1.5"
        >
          {[...primaryNavKeys, ...marketNavKeys].map((item) => (
            <SiteNavLink
              key={item.href}
              href={item.href}
              className="inline-flex h-8 shrink-0 items-center rounded-lg px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-item-hover hover:text-foreground"
              activeClassName="bg-muted text-foreground"
            >
              {t(item.key)}
            </SiteNavLink>
          ))}
        </nav>
      </div>

    </header>
  );
}
