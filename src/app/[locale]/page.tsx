import { BarChart3, MessageSquare, Shield } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const blocks = [
  {
    titleKey: "block_tools_title" as const,
    descKey: "block_tools_desc" as const,
    href: "/tools" as const,
    icon: BarChart3,
  },
  {
    titleKey: "block_quotes_title" as const,
    descKey: "block_quotes_desc" as const,
    href: "/quotes" as const,
    icon: Shield,
  },
  {
    titleKey: "block_social_title" as const,
    descKey: "block_social_desc" as const,
    href: "/forum" as const,
    icon: MessageSquare,
  },
] as const;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tHome = await getTranslations("home");
  const tNav = await getTranslations("nav");
  const tCommon = await getTranslations("common");

  return (
    <div className="space-y-16">
      <section className="text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">
          {tHome("badge")}
        </p>
        <h1 className="mt-4 font-heading text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          {tHome.rich("headline", {
            tools: (chunks) => (
              <span className="text-primary">{chunks}</span>
            ),
            data: (chunks) => (
              <span className="text-chart-3">{chunks}</span>
            ),
            people: (chunks) => (
              <span className="text-chart-4">{chunks}</span>
            ),
          })}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          {tHome("subtitle")}
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link href="/quotes" className={cn(buttonVariants({ size: "lg" }))}>
            {tHome("cta_quotes")}
          </Link>
          <Link
            href="/academy"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "border-border",
            )}
          >
            {tNav("academy")}
          </Link>
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
          >
            {tCommon("dashboard")}
          </Link>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {blocks.map((b) => (
          <Link
            key={b.href}
            href={b.href}
            className="group rounded-2xl border border-border bg-card/50 p-6 ring-1 ring-foreground/5 transition hover:border-primary/30 hover:bg-card"
          >
            <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-muted ring-1 ring-border">
              <b.icon className="size-5 text-primary" />
            </div>
            <h2 className="font-heading text-lg font-medium text-foreground group-hover:text-primary">
              {tHome(b.titleKey)}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {tHome(b.descKey)}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
