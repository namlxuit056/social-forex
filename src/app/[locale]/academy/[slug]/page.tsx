import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SignupPrompt } from "@/components/analytics/signup-prompt";
import { Disclaimer } from "@/components/layout/disclaimer";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { Badge } from "@/components/ui/badge";
import { getAcademyLesson, getAcademyLessons, getRelatedLessons } from "@/lib/content/academy";
import { findRelatedArticles } from "@/lib/related-articles";
import { pageCtaItems } from "@/lib/page-cta-i18n";
import { absoluteUrl } from "@/lib/site-url";
import { routing } from "@/i18n/routing";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-json-ld";
import { BreadcrumbNav } from "@/components/seo/breadcrumb-nav";
import { RelatedLessons, RelatedArticles } from "@/components/seo/related-content";

type Props = { params: Promise<{ slug: string; locale: string }> };

export async function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    getAcademyLessons(locale).map((lesson) => ({
      locale,
      slug: lesson.slug,
    })),
  );
}

export async function generateMetadata({ params }: Props) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const lesson = getAcademyLesson(slug, locale);
  if (!lesson) return {};

  return {
    title: lesson.title,
    description: lesson.summary,
    keywords: lesson.keywords,
    alternates: {
      canonical: absoluteUrl(`/academy/${slug}`, locale),
      languages: {
        vi: absoluteUrl(`/academy/${slug}`, "vi"),
        en: absoluteUrl(`/academy/${slug}`, "en"),
        "x-default": absoluteUrl(`/academy/${slug}`, routing.defaultLocale),
      },
    },
    openGraph: {
      type: "article",
      title: lesson.title,
      description: lesson.summary,
      url: absoluteUrl(`/academy/${slug}`, locale),
      siteName: "Social Forex",
      section: "Academy",
      tags: lesson.keywords,
    },
    twitter: {
      card: "summary",
      title: lesson.title,
      description: lesson.summary,
    },
  };
}

export default async function AcademyLessonPage({ params }: Props) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("academy");
  const tCommon = await getTranslations("common");
  const ctaRow = await pageCtaItems("learn", "trading");

  const lesson = getAcademyLesson(slug, locale);
  if (!lesson) notFound();

  const levelLabel: Record<string, string> = {
    beginner: t("beginner"),
    intermediate: t("intermediate"),
    advanced: t("advanced"),
  };

  const courseJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: lesson.title,
    description: lesson.summary,
    provider: {
      "@type": "Organization",
      name: "Social Forex",
      url: absoluteUrl("", locale),
    },
    inLanguage: locale === "vi" ? "vi" : "en",
    educationalLevel: lesson.level,
    keywords: lesson.keywords.join(", "),
    url: absoluteUrl(`/academy/${slug}`, locale),
  };

  const relatedLessons = getRelatedLessons(slug, locale, 3);
  const relatedArticles = await findRelatedArticles({
    keywords: lesson.keywords,
    locale,
    limit: 3,
  });

  return (
    <div className="space-y-8">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger -- JSON-LD requires inline script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Social Forex", path: "/" },
          { name: "Academy", path: "/academy" },
          { name: lesson.title, path: `/academy/${slug}` },
        ]}
        locale={locale}
      />
      <BreadcrumbNav
        items={[
          { label: tCommon("home"), href: "/" },
          { label: "Academy", href: "/academy" },
          { label: lesson.title },
        ]}
      />
      <article className="max-w-2xl space-y-6">
        <div>
          <Badge variant="outline" className="mb-3 text-xs">
            {levelLabel[lesson.level] ?? lesson.level}
          </Badge>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            {lesson.title}
          </h1>
          <p className="mt-2 text-muted-foreground">{lesson.summary}</p>
        </div>

        <div className="prose prose-invert max-w-none text-sm leading-relaxed text-foreground/90">
          {lesson.body.split("\n").map((line, i) => {
            if (line.startsWith("## ")) {
              return (
                <h2
                  key={i}
                  className="mb-3 mt-8 font-heading text-lg font-semibold text-foreground"
                >
                  {line.replace("## ", "")}
                </h2>
              );
            }
            if (line.startsWith("### ")) {
              return (
                <h3
                  key={i}
                  className="mb-2 mt-6 font-heading text-base font-medium text-foreground"
                >
                  {line.replace("### ", "")}
                </h3>
              );
            }
            if (line.startsWith("| ")) {
              return (
                <p key={i} className="font-mono text-xs text-muted-foreground">
                  {line}
                </p>
              );
            }
            if (line.startsWith("- ")) {
              return (
                <li key={i} className="ml-4 list-disc text-foreground/80">
                  {renderInlineMarkdown(line.replace(/^- /, ""))}
                </li>
              );
            }
            if (/^\d+\. /.test(line)) {
              return (
                <li key={i} className="ml-4 list-decimal text-foreground/80">
                  {renderInlineMarkdown(line.replace(/^\d+\. /, ""))}
                </li>
              );
            }
            if (line.trim() === "") {
              return <div key={i} className="h-2" />;
            }
            return (
              <p key={i} className="text-foreground/80">
                {renderInlineMarkdown(line)}
              </p>
            );
          })}
        </div>

        <Disclaimer variant="compact" />

        <SignupPrompt
          surface="academy_progress"
          title={t("signupPromptTitle")}
          description={t("signupPromptDesc")}
          ctaLabel={t("signupPromptCta")}
          className="not-prose"
        />

        <p className="text-sm text-muted-foreground">
          <Link href="/academy" className="font-medium text-primary hover:underline">
            {t("backToList")}
          </Link>
        </p>
      </article>

      <div className="max-w-2xl space-y-8">
        <RelatedLessons lessons={relatedLessons} label={t("relatedLessons")} />
        <RelatedArticles articles={relatedArticles} label={t("relatedArticles")} />
      </div>

      <PageCtaRow heading={tCommon("ctaDiscovery")} items={ctaRow} />
    </div>
  );
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
