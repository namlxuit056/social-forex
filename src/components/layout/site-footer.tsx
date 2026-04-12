import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

const footerNavKeys = [
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
          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {footerNavKeys.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-muted-foreground transition hover:text-foreground"
              >
                {tn(l.key)}
              </Link>
            ))}
          </nav>
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-xs leading-relaxed text-muted-foreground/80">
          <p className="font-medium text-muted-foreground">
            {tf("disclaimerTitle")}
          </p>
          <p
            className="mt-1"
            dangerouslySetInnerHTML={{ __html: tf("disclaimerBody") }}
          />
        </div>

        <p className="text-center text-xs text-muted-foreground/60">
          {tc("copyright", { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
