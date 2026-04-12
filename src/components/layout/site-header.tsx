import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navKeys = [
  { href: "/quotes", key: "quotes" },
  { href: "/calendar", key: "calendar" },
  { href: "/tools", key: "tools" },
  { href: "/chart", key: "chart" },
  { href: "/forum", key: "forum" },
  { href: "/forum/search", key: "searchTopics" },
  { href: "/signals", key: "signals" },
  { href: "/leaderboard", key: "leaderboard" },
  { href: "/messages", key: "messages" },
  { href: "/sentiment", key: "sentiment" },
  { href: "/heatmap", key: "heatmap" },
  { href: "/backtest", key: "backtest" },
  { href: "/academy", key: "academy" },
  { href: "/webinar", key: "webinar" },
  { href: "/resources", key: "resources" },
  { href: "/brokers", key: "brokers" },
  { href: "/partners", key: "partners" },
] as const;

const navLinkClass =
  "rounded-md px-2 py-1 text-muted-foreground transition hover:bg-muted hover:text-foreground";

export async function SiteHeader() {
  const session = await auth();
  const t = await getTranslations("nav");
  const tc = await getTranslations("common");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="font-semibold tracking-tight text-primary transition hover:text-primary/90"
          >
            Social Forex
          </Link>
          <nav className="hidden items-center gap-1 text-sm lg:flex">
            {navKeys.map((item) => (
              <Link key={item.href} href={item.href} className={navLinkClass}>
                {t(item.key)}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <LanguageSwitcher />
          {session?.user ? (
            <>
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({ variant: "default", size: "sm" }),
                  "hidden sm:inline-flex",
                )}
              >
                {tc("dashboard")}
              </Link>
              <Link
                href="/profile"
                className="text-foreground/90 hover:text-foreground"
              >
                {session.user.name ?? session.user.email}
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="text-muted-foreground hover:text-foreground"
              >
                {tc("signIn")}
              </Link>
              <Link
                href="/auth/register"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                {tc("signUp")}
              </Link>
            </>
          )}
        </div>
      </div>
      <div className="border-t border-border/60 px-4 py-2 lg:hidden">
        <nav className="flex max-w-7xl flex-wrap gap-1 text-xs">
          {navKeys.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded px-2 py-1 text-muted-foreground hover:bg-muted"
            >
              {t(item.key)}
            </Link>
          ))}
          {session?.user ? (
            <Link
              href="/dashboard"
              className="rounded px-2 py-1 font-medium text-primary hover:bg-muted"
            >
              {tc("dashboard")}
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
