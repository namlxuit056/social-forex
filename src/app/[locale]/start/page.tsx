import { getTranslations, setRequestLocale } from "next-intl/server";
import { SignupPrompt } from "@/components/analytics/signup-prompt";
import { TrackedAnchor, TrackedLink } from "@/components/analytics/tracked-link";
import { Disclaimer } from "@/components/layout/disclaimer";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { FaqJsonLd } from "@/components/seo/faq-json-ld";
import { AiAssistantPromptCard } from "@/components/start/ai-assistant-prompt-card";
import { OnboardingChecklist } from "@/components/start/onboarding-checklist";
import { buttonVariants } from "@/components/ui/button";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { getExnessAffiliateUrl } from "@/lib/exness-affiliate";
import {
  EXNESS_MT5_PLATFORM_URL,
  getMt5DownloadUrl,
} from "@/lib/start-broker-links";
import { absoluteUrl, getSiteUrl } from "@/lib/site-url";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { pageCtaItems } from "@/lib/page-cta-i18n";

const AFFILIATE_REL = "noopener noreferrer sponsored nofollow" as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("start");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: absoluteUrl("/start", locale),
      languages: {
        vi: absoluteUrl("/start", "vi"),
        en: absoluteUrl("/start", "en"),
        "x-default": absoluteUrl("/start", routing.defaultLocale),
      },
    },
  };
}

export default async function StartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("start");
  const tCommon = await getTranslations("common");
  const ctaRow = await pageCtaItems("learn", "explore");

  const origin = getSiteUrl();
  const exnessAffiliateUrl = getExnessAffiliateUrl();
  const mt5DownloadUrl = getMt5DownloadUrl(locale);

  const faqItems = [
    { question: t("schemaFaq.q1"), answer: t("schemaFaq.a1") },
    { question: t("schemaFaq.q2"), answer: t("schemaFaq.a2") },
    { question: t("schemaFaq.q3"), answer: t("schemaFaq.a3") },
    { question: t("schemaFaq.q4"), answer: t("schemaFaq.a4") },
  ];

  const promptText = t("aiAssistantTemplate", {
    origin,
    startUrl: absoluteUrl("/start", locale),
    calendarUrl: absoluteUrl("/calendar", locale),
    quotesUrl: absoluteUrl("/quotes", locale),
    academyUrl: absoluteUrl("/academy", locale),
    llmsUrl: `${origin}/llms.txt`,
  });

  return (
    <div className="space-y-10">
      <FaqJsonLd items={faqItems} />
      <header className="space-y-3">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-muted-foreground">{t("subtitle")}</p>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground/90">
          {t("intro")}
        </p>
      </header>

      <SignupPrompt
        surface="start_progress"
        title={t("signupPromptTitle")}
        description={t("signupPromptDesc")}
        ctaLabel={t("signupPromptCta")}
      />

      <OnboardingChecklist />

      <ol className="space-y-6">
        <li className="relative rounded-xl border border-border bg-card/40 p-5 pl-6 ring-1 ring-foreground/5 md:p-6 md:pl-8">
          <span
            className="absolute left-0 top-5 flex size-8 -translate-x-1/2 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-xs font-semibold text-primary md:top-6"
            aria-hidden
          >
            1
          </span>
          <h2 className="font-heading text-lg font-medium text-foreground">
            {t("brokerStep1_title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("brokerStep1_body")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <TrackedAnchor
              href={exnessAffiliateUrl}
              target="_blank"
              rel={AFFILIATE_REL}
              eventName={ANALYTICS_EVENTS.startCtaClick}
              eventProperties={{
                cta: "exness_registration",
                destination: "external_exness",
              }}
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "text-xs font-medium",
              )}
            >
              {t("brokerStep1_cta")}
            </TrackedAnchor>
          </div>
        </li>

        <li className="relative rounded-xl border border-border bg-card/40 p-5 pl-6 ring-1 ring-foreground/5 md:p-6 md:pl-8">
          <span
            className="absolute left-0 top-5 flex size-8 -translate-x-1/2 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-xs font-semibold text-primary md:top-6"
            aria-hidden
          >
            2
          </span>
          <h2 className="font-heading text-lg font-medium text-foreground">
            {t("brokerStep2_title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("brokerStep2_body")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <TrackedAnchor
              href={mt5DownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              eventName={ANALYTICS_EVENTS.startCtaClick}
              eventProperties={{
                cta: "mt5_download",
                destination: "external_mt5",
              }}
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                "text-xs font-medium",
              )}
            >
              {t("brokerStep2_cta_mt5")}
            </TrackedAnchor>
            <TrackedAnchor
              href={EXNESS_MT5_PLATFORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              eventName={ANALYTICS_EVENTS.startCtaClick}
              eventProperties={{
                cta: "exness_mt5_page",
                destination: "external_exness_mt5",
              }}
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                "text-xs font-medium",
              )}
            >
              {t("brokerStep2_cta_exness")}
            </TrackedAnchor>
          </div>
        </li>

        <li className="relative rounded-xl border border-border bg-card/40 p-5 pl-6 ring-1 ring-foreground/5 md:p-6 md:pl-8">
          <span
            className="absolute left-0 top-5 flex size-8 -translate-x-1/2 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-xs font-semibold text-primary md:top-6"
            aria-hidden
          >
            3
          </span>
          <h2 className="font-heading text-lg font-medium text-foreground">
            {t("brokerStep3_title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("brokerStep3_body")}
          </p>
        </li>

        <li className="relative rounded-xl border border-border bg-card/40 p-5 pl-6 ring-1 ring-foreground/5 md:p-6 md:pl-8">
          <span
            className="absolute left-0 top-5 flex size-8 -translate-x-1/2 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-xs font-semibold text-primary md:top-6"
            aria-hidden
          >
            4
          </span>
          <h2 className="font-heading text-lg font-medium text-foreground">
            {t("brokerStep4_title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("brokerStep4_body")}
          </p>
        </li>

        <li className="relative rounded-xl border border-border bg-card/40 p-5 pl-6 ring-1 ring-foreground/5 md:p-6 md:pl-8">
          <span
            className="absolute left-0 top-5 flex size-8 -translate-x-1/2 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-xs font-semibold text-primary md:top-6"
            aria-hidden
          >
            5
          </span>
          <h2 className="font-heading text-lg font-medium text-foreground">
            {t("brokerStep5_title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("brokerStep5_body")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <TrackedLink
              href="/quotes"
              eventName={ANALYTICS_EVENTS.startCtaClick}
              eventProperties={{
                cta: "xauusd_quotes",
                destination: "/quotes",
              }}
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                "text-xs font-medium",
              )}
            >
              {t("brokerStep5_ctaQuotes")}
            </TrackedLink>
          </div>
        </li>
      </ol>

      <AiAssistantPromptCard
        title={t("aiAssistantTitle")}
        intro={t("aiAssistantIntro")}
        promptText={promptText}
        copyLabel={t("aiAssistantCopy")}
        copiedLabel={t("aiAssistantCopied")}
      />

      <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-5 text-center">
        <p className="text-sm text-muted-foreground">{t("closingHint")}</p>
        <TrackedLink
          href="/academy"
          eventName={ANALYTICS_EVENTS.startCtaClick}
          eventProperties={{ cta: "academy_after_start", destination: "/academy" }}
          className={cn(
            buttonVariants({ variant: "default", size: "sm" }),
            "mt-4 inline-flex",
          )}
        >
          {t("ctaAcademyIndex")}
        </TrackedLink>
      </div>

      <Disclaimer variant="compact" />
      <PageCtaRow heading={tCommon("ctaDiscovery")} items={ctaRow} />
    </div>
  );
}
