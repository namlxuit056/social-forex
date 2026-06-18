import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

const footerNavKeys = [
  { href: "/start", key: "startHere" },
  { href: "/quotes", key: "quotes" },
  { href: "/calendar", key: "calendar" },
  { href: "/forum", key: "forum" },
  { href: "/signals", key: "signals" },
  { href: "/academy", key: "academy" },
  { href: "/tools", key: "tools" },
] as const;

export async function SiteFooter() {
  const tn = await getTranslations("nav");
  const tf = await getTranslations("footer");
  const tc = await getTranslations("common");

  return (
    <footer className="border-t border-border bg-background px-4 py-10 text-sm text-muted-foreground">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-medium text-foreground/90">Social Forex</p>
            <p className="mt-2 max-w-md leading-relaxed">{tf("tagline")}</p>
          </div>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            {footerNavKeys.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-muted-foreground transition hover:text-foreground"
              >
                {tn(l.key)}
              </Link>
            ))}
            <a
              href="/llms.txt"
              className="text-muted-foreground transition hover:text-foreground"
            >
              {tf("llmsLink")}
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-3">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 shrink-0 fill-blue-400"
            aria-hidden="true"
          >
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground/90">
              {tf("telegramCta")}
            </p>
            <a
              href="https://t.me/toolforex"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 transition"
            >
              t.me/toolforex
            </a>
          </div>
          <a
            href="https://t.me/toolforex"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-md bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-400"
          >
            {tf("telegramCta")}
          </a>
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-xs leading-relaxed text-muted-foreground/80">
          <p className="font-medium text-muted-foreground">
            {tf("disclaimerTitle")}
          </p>
          <p
            className="mt-1"
            dangerouslySetInnerHTML={{ __html: tf.raw("disclaimerBody") }}
          />
        </div>

        <p className="text-center text-xs text-muted-foreground/60">
          {tc("copyright", { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
