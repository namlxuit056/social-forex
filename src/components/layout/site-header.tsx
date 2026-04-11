import Link from "next/link";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";

const nav = [
  { href: "/quotes", label: "Tỷ giá live" },
  { href: "/calendar", label: "Lịch kinh tế" },
  { href: "/tools", label: "Công cụ" },
  { href: "/chart", label: "Biểu đồ" },
  { href: "/forum", label: "Diễn đàn" },
  { href: "/signals", label: "Tín hiệu" },
  { href: "/leaderboard", label: "BXH" },
  { href: "/sentiment", label: "Sentiment" },
  { href: "/heatmap", label: "Heatmap" },
  { href: "/backtest", label: "Backtest" },
  { href: "/academy", label: "Academy" },
];

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="font-semibold tracking-tight text-emerald-400 transition hover:text-emerald-300"
          >
            Social Forex
          </Link>
          <nav className="hidden items-center gap-1 text-sm text-zinc-400 lg:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-2 py-1 transition hover:bg-zinc-800 hover:text-zinc-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {session?.user ? (
            <>
              <Link
                href="/profile"
                className="text-zinc-300 hover:text-white"
              >
                {session.user.name ?? session.user.email}
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="text-zinc-300 hover:text-white"
              >
                Đăng nhập
              </Link>
              <Link
                href="/auth/register"
                className="rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-500"
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
      <div className="border-t border-zinc-800/60 px-4 py-2 lg:hidden">
        <nav className="flex max-w-7xl flex-wrap gap-1 text-xs text-zinc-400">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded px-2 py-1 hover:bg-zinc-800"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
