import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ExternalLink,
  NotebookPen,
  Shield,
} from "lucide-react";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { HomeTopTraders } from "@/components/home/home-top-traders";
import { NewcomerPathSection } from "@/components/home/newcomer-path";
import { SignalDirectionsBoard } from "@/components/home/signal-directions-board";
import { MarketVolatilityNote } from "@/components/market/market-volatility-note";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-json-ld";
import { FaqJsonLd } from "@/components/seo/faq-json-ld";
import { WebsiteJsonLd } from "@/components/seo/website-json-ld";
import { buttonVariants } from "@/components/ui/button";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { getExnessAffiliateUrl } from "@/lib/exness-affiliate";
import { absoluteUrl } from "@/lib/site-url";
import { routing } from "@/i18n/routing";
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

const challengeDays = [
  {
    titleKey: "day1Title" as const,
    href: "/calendar" as const,
    icon: CalendarCheck,
  },
  {
    titleKey: "day2Title" as const,
    href: "/desk" as const,
    icon: BarChart3,
  },
  {
    titleKey: "day3Title" as const,
    href: "/tools" as const,
    icon: Shield,
  },
  {
    titleKey: "day4Title" as const,
    href: "/academy/forex-position-sizing-1-percent-rule" as const,
    icon: BookOpen,
  },
  {
    titleKey: "day5Title" as const,
    href: "/journal" as const,
    icon: NotebookPen,
  },
  {
    titleKey: "day6Title" as const,
    href: "/journal" as const,
    icon: CheckCircle2,
  },
  {
    titleKey: "day7Title" as const,
    href: "/challenge" as const,
    icon: CheckCircle2,
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
    alternates: {
      canonical: absoluteUrl("/", locale),
      languages: {
        vi: absoluteUrl("/", "vi"),
        en: absoluteUrl("/", "en"),
        "x-default": absoluteUrl("/", routing.defaultLocale),
      },
    },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Layout already 404s unknown locales, but the page renders in parallel —
  // without this a junk path (/wp-login.php) crashes toLocaleString below.
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const tHome = await getTranslations("home");
  const tChallenge = await getTranslations("challenge");
  const tf = await getTranslations("schemaFaqHome");
  const exnessAffiliateUrl = getExnessAffiliateUrl();
  const nowIso = new Date().toISOString();

  const faqItems = [
    { question: tf("q1"), answer: tf("a1") },
    { question: tf("q2"), answer: tf("a2") },
    { question: tf("q3"), answer: tf("a3") },
    { question: tf("q4"), answer: tf("a4") },
    { question: tf("q5"), answer: tf("a5") },
  ];

  return (
    <div className="space-y-10">
      <WebsiteJsonLd locale={locale} />
      <BreadcrumbJsonLd
        items={[{ name: tHome("metaTitle"), path: "/" }]}
        locale={locale}
      />
      <FaqJsonLd items={faqItems} />
      <section className="max-w-3xl">
        <p className="text-sm font-medium text-primary">
          {tHome("badge")}
        </p>
        <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          {tHome.rich("headline", {
            tools: (chunks) => (
              <span className="text-primary">{chunks}</span>
            ),
            data: (chunks) => chunks,
            people: (chunks) => chunks,
          })}
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
          {tHome("subtitle")}
        </p>
        <ul className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-5">
          {(["heroTrust1", "heroTrust2", "heroTrust3"] as const).map((key) => (
            <li
              key={key}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden />
              <span>{tHome(key)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row">
          <TrackedLink
            href="/challenge"
            eventName={ANALYTICS_EVENTS.homepageCtaClick}
            eventProperties={{
              cta: "demo_challenge",
              destination: "/challenge",
              surface: "hero",
            }}
            className={cn(
              buttonVariants({ size: "lg" }),
              "w-full justify-center sm:w-auto sm:min-w-48",
            )}
          >
            {tHome("cta_challenge")}
          </TrackedLink>
          <TrackedLink
            href="/start"
            eventName={ANALYTICS_EVENTS.homepageCtaClick}
            eventProperties={{
              cta: "start_guide",
              destination: "/start",
              surface: "hero",
            }}
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "w-full justify-center sm:w-auto sm:min-w-48",
            )}
          >
            {tHome("cta_start")}
          </TrackedLink>
        </div>
      </section>

      <MarketVolatilityNote serverNowIso={nowIso} locale={locale} />

      <SignalDirectionsBoard locale={locale} nowIso={nowIso} />

      <section
        aria-labelledby="challenge-preview-heading"
        className="rounded-xl border border-border bg-card p-5 sm:p-6"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="challenge-preview-heading"
              className="font-heading text-xl font-semibold tracking-tight text-foreground"
            >
              {tHome("challengePreviewTitle")}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {tHome("challengePreviewDesc")}
            </p>
          </div>
          <TrackedLink
            href="/challenge"
            eventName={ANALYTICS_EVENTS.homepageCtaClick}
            eventProperties={{
              cta: "challenge_preview",
              destination: "/challenge",
              surface: "challenge_preview",
            }}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "w-full justify-center sm:w-auto",
            )}
          >
            {tHome("cta_challenge")}
          </TrackedLink>
        </div>
        <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {challengeDays.map((day, index) => {
            const Icon = day.icon;
            return (
              <li key={day.titleKey} className="min-w-0">
                <TrackedLink
                  href={day.href}
                  eventName={ANALYTICS_EVENTS.homepageCtaClick}
                  eventProperties={{
                    cta: `challenge_day_${index + 1}`,
                    destination: day.href,
                    surface: "challenge_preview",
                  }}
                  className="group flex h-full min-h-28 flex-col rounded-lg border border-border p-3 transition-colors hover:bg-muted"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                      {index + 1}
                    </span>
                    <Icon className="size-4 text-muted-foreground" aria-hidden />
                  </div>
                  <h3 className="text-sm font-medium leading-snug text-foreground">
                    {tChallenge(day.titleKey)}
                  </h3>
                </TrackedLink>
              </li>
            );
          })}
        </ol>
      </section>

      <NewcomerPathSection />

      <HomeTopTraders />

      <section className="rounded-xl border border-border bg-card p-4 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:p-5">
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
            "mt-4 w-full justify-center sm:mt-0 sm:w-auto",
          )}
        >
          <ExternalLink className="size-4 shrink-0" aria-hidden />
          {tHome("exness_cta")}
        </a>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {blocks.map((b) => (
          <Link
            key={b.href}
            href={b.href}
            className="group rounded-xl border border-border bg-card p-5 transition-colors hover:bg-muted/50"
          >
            <div className="mb-3 flex size-8 items-center justify-center rounded-lg bg-muted">
              <b.icon className="size-4 text-muted-foreground" aria-hidden />
            </div>
            <h2 className="font-heading text-base font-medium text-foreground">
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
