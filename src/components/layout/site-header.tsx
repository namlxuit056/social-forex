import Link from "next/link";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/quotes", label: "Tỷ giá live" },
  { href: "/calendar", label: "Lịch kinh tế" },
  { href: "/tools", label: "Công cụ" },
  { href: "/chart", label: "Biểu đồ" },
  { href: "/forum", label: "Diễn đàn" },
  { href: "/forum/search", label: "Tìm" },
  { href: "/signals", label: "Tín hiệu" },
  { href: "/leaderboard", label: "BXH" },
  { href: "/messages", label: "Tin nhắn" },
  { href: "/sentiment", label: "Sentiment" },
  { href: "/heatmap", label: "Heatmap" },
  { href: "/backtest", label: "Backtest" },
  { href: "/academy", label: "Academy" },
  { href: "/webinar", label: "Webinar" },
  { href: "/resources", label: "Tài liệu" },
  { href: "/brokers", label: "Sàn" },
  { href: "/partners", label: "Đối tác" },
];

const navLinkClass =
  "rounded-md px-2 py-1 text-muted-foreground transition hover:bg-muted hover:text-foreground";

export async function SiteHeader() {
  const session = await auth();

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
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className={navLinkClass}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {session?.user ? (
            <>
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({ variant: "default", size: "sm" }),
                  "hidden sm:inline-flex",
                )}
              >
                Dashboard
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
                Đăng nhập
              </Link>
              <Link
                href="/auth/register"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
      <div className="border-t border-border/60 px-4 py-2 lg:hidden">
        <nav className="flex max-w-7xl flex-wrap gap-1 text-xs">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded px-2 py-1 text-muted-foreground hover:bg-muted"
            >
              {item.label}
            </Link>
          ))}
          {session?.user ? (
            <Link
              href="/dashboard"
              className="rounded px-2 py-1 font-medium text-primary hover:bg-muted"
            >
              Dashboard
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
