import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Disclaimer } from "@/components/layout/disclaimer";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { FaqJsonLd } from "@/components/seo/faq-json-ld";
import { AiAssistantPromptCard } from "@/components/start/ai-assistant-prompt-card";
import { buttonVariants } from "@/components/ui/button";
import { absoluteUrl, getSiteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";
import { pageCtaItems } from "@/lib/page-cta-i18n";

const steps = [
  {
    titleKey: "step1_title" as const,
    bodyKey: "step1_body" as const,
    links: [
      { href: "/academy/risk-1pct" as const, labelKey: "step1_linkAcademy" as const },
      { href: "/tools" as const, labelKey: "step1_linkTools" as const },
    ],
  },
  {
    titleKey: "step2_title" as const,
    bodyKey: "step2_body" as const,
    links: [
      { href: "/academy/spread-liquidity" as const, labelKey: "step2_linkAcademy" as const },
      { href: "/quotes" as const, labelKey: "step2_linkQuotes" as const },
    ],
  },
  {
    titleKey: "step3_title" as const,
    bodyKey: "step3_body" as const,
    links: [
      { href: "/calendar" as const, labelKey: "step3_linkCalendar" as const },
      { href: "/academy/news-trading" as const, labelKey: "step3_linkAcademy" as const },
    ],
  },
  {
    titleKey: "step4_title" as const,
    bodyKey: "step4_body" as const,
    links: [
      { href: "/chart" as const, labelKey: "step4_linkChart" as const },
      { href: "/heatmap" as const, labelKey: "step4_linkHeatmap" as const },
    ],
  },
  {
    titleKey: "step5_title" as const,
    bodyKey: "step5_body" as const,
    links: [
      { href: "/brokers" as const, labelKey: "step5_linkBrokers" as const },
      { href: "/resources" as const, labelKey: "step5_linkResources" as const },
    ],
  },
  {
    titleKey: "step6_title" as const,
    bodyKey: "step6_body" as const,
    links: [
      { href: "/forum" as const, labelKey: "step6_linkForum" as const },
      { href: "/signals" as const, labelKey: "step6_linkSignals" as const },
    ],
  },
] as const;

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
    riskLessonUrl: absoluteUrl("/academy/risk-1pct", locale),
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

      <AiAssistantPromptCard
        title={t("aiAssistantTitle")}
        intro={t("aiAssistantIntro")}
        promptText={promptText}
        copyLabel={t("aiAssistantCopy")}
        copiedLabel={t("aiAssistantCopied")}
      />

      <ol className="space-y-6">
        {steps.map((step, index) => (
          <li
            key={step.titleKey}
            className="relative rounded-xl border border-border bg-card/40 p-5 pl-6 ring-1 ring-foreground/5 md:p-6 md:pl-8"
          >
            <span
              className="absolute left-0 top-5 flex size-8 -translate-x-1/2 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-xs font-semibold text-primary md:top-6"
              aria-hidden
            >
              {index + 1}
            </span>
            <h2 className="font-heading text-lg font-medium text-foreground">
              {t(step.titleKey)}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t(step.bodyKey)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {step.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "sm" }),
                    "text-xs font-medium",
                  )}
                >
                  {t(l.labelKey)}
                </Link>
              ))}
            </div>
          </li>
        ))}
      </ol>

      <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-5 text-center">
        <p className="text-sm text-muted-foreground">{t("closingHint")}</p>
        <Link
          href="/academy"
          className={cn(
            buttonVariants({ variant: "default", size: "sm" }),
            "mt-4 inline-flex",
          )}
        >
          {t("ctaAcademyIndex")}
        </Link>
      </div>

      <Disclaimer variant="compact" />
      <PageCtaRow heading={tCommon("next")} items={ctaRow} />
    </div>
  );
}
