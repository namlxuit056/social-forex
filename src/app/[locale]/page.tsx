import { BarChart3, BookOpen, ExternalLink, Shield } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { NewcomerPathSection } from "@/components/home/newcomer-path";
import { FaqJsonLd } from "@/components/seo/faq-json-ld";
import { buttonVariants } from "@/components/ui/button";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { getExnessAffiliateUrl } from "@/lib/exness-affiliate";
import { cn } from "@/lib/utils";

const blocks = [
  {
    titleKey: "block_beginner_title" as const,
    descKey: "block_beginner_desc" as const,
    href: "/start" as const,
    icon: BookOpen,
  },
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
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const rawKeywords = t("metaKeywords");
  const keywords = rawKeywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    ...(keywords.length > 0 ? { keywords } : {}),
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tHome = await getTranslations("home");
  const tf = await getTranslations("schemaFaqHome");
  const exnessAffiliateUrl = getExnessAffiliateUrl();

  const faqItems = [
    { question: tf("q1"), answer: tf("a1") },
    { question: tf("q2"), answer: tf("a2") },
    { question: tf("q3"), answer: tf("a3") },
    { question: tf("q4"), answer: tf("a4") },
    { question: tf("q5"), answer: tf("a5") },
  ];

  return (
    <div className="space-y-16">
      <FaqJsonLd items={faqItems} />
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
        <div className="mx-auto mt-10 flex w-full max-w-xl flex-col items-stretch gap-3 sm:max-w-none sm:items-center">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <TrackedLink
              href="/challenge"
              eventName={ANALYTICS_EVENTS.homepageCtaClick}
              eventProperties={{ cta: "demo_challenge", destination: "/challenge" }}
              className={cn(
                buttonVariants({ size: "lg" }),
                "w-full justify-center sm:w-auto sm:min-w-48",
              )}
            >
              {tHome("cta_challenge")}
            </TrackedLink>
            <TrackedLink
              href="/desk"
              eventName={ANALYTICS_EVENTS.homepageCtaClick}
              eventProperties={{ cta: "live_desk", destination: "/desk" }}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "w-full justify-center border-border sm:w-auto sm:min-w-48",
              )}
            >
              {tHome("cta_desk")}
            </TrackedLink>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-center sm:gap-3">
            <TrackedLink
              href="/academy"
              eventName={ANALYTICS_EVENTS.homepageCtaClick}
              eventProperties={{ cta: "academy", destination: "/academy" }}
              className={cn(
                buttonVariants({ variant: "outline", size: "default" }),
                "w-full justify-center border-border",
              )}
            >
              {tHome("cta_academy")}
            </TrackedLink>
            <TrackedLink
              href="/quotes"
              eventName={ANALYTICS_EVENTS.homepageCtaClick}
              eventProperties={{ cta: "quotes", destination: "/quotes" }}
              className={cn(
                buttonVariants({ variant: "outline", size: "default" }),
                "w-full justify-center border-border",
              )}
            >
              {tHome("cta_quotes")}
            </TrackedLink>
            <TrackedLink
              href="/calendar"
              eventName={ANALYTICS_EVENTS.homepageCtaClick}
              eventProperties={{ cta: "calendar", destination: "/calendar" }}
              className={cn(
                buttonVariants({ variant: "outline", size: "default" }),
                "w-full justify-center border-border",
              )}
            >
              {tHome("cta_calendar")}
            </TrackedLink>
          </div>
        </div>
      </section>

      <NewcomerPathSection />

      <section className="rounded-xl border border-border/70 bg-card/45 px-4 py-4 ring-1 ring-foreground/5 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h2 className="font-heading text-base font-medium text-foreground">
            {tHome("demoPathTitle")}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {tHome("demoPathDesc")}
          </p>
        </div>
        <a
          href={exnessAffiliateUrl}
          target="_blank"
          rel="noopener noreferrer sponsored nofollow"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "mt-4 w-full justify-center border-primary/30 text-primary hover:bg-primary/10 sm:mt-0 sm:w-auto",
          )}
        >
          <ExternalLink className="size-4 shrink-0" aria-hidden />
          {tHome("exness_cta")}
        </a>
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
