import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BackLink } from "@/components/layout/back-link";
import { Disclaimer } from "@/components/layout/disclaimer";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/site-url";

type Props = { params: Promise<{ locale: string; slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const article = await prisma.aiGeneratedArticle.findUnique({
    where: { locale_slug: { locale, slug } },
  });
  if (!article || article.status !== "PUBLISHED") return {};

  return {
    title: article.title,
    description: article.metaDescription,
    keywords: article.sourceKeywords,
    alternates: { canonical: absoluteUrl(`/articles/${slug}`, locale) },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.metaDescription,
      url: absoluteUrl(`/articles/${slug}`, locale),
      siteName: "Social Forex",
      section: "AI Articles",
      tags: article.sourceKeywords,
      publishedTime: article.publishedAt?.toISOString(),
    },
    twitter: {
      card: "summary",
      title: article.title,
      description: article.metaDescription,
    },
  };
}

function formatDate(value: Date | null, locale: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(value);
}

export default async function ArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("articles");

  const article = await prisma.aiGeneratedArticle.findUnique({
    where: { locale_slug: { locale, slug } },
  });
  if (!article || article.status !== "PUBLISHED") notFound();

  const articleUrl = absoluteUrl(`/articles/${slug}`, locale);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.metaDescription,
    keywords: article.sourceKeywords.join(", "),
    datePublished: (article.publishedAt ?? article.generatedAt).toISOString(),
    dateModified: article.updatedAt.toISOString(),
    url: articleUrl,
    inLanguage: locale,
    author: {
      "@type": "Organization",
      name: "Social Forex",
      url: absoluteUrl("", locale),
    },
    publisher: {
      "@type": "Organization",
      name: "Social Forex",
      url: absoluteUrl("", locale),
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
    about: { "@type": "Thing", name: article.keyword },
  };

  return (
    <div className="space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BackLink href="/articles">{t("backToList")}</BackLink>
      <article className="max-w-2xl space-y-6">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{article.keyword}</Badge>
            <span className="text-xs text-muted-foreground">
              {formatDate(article.publishedAt ?? article.generatedAt, locale)}
            </span>
          </div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            {article.title}
          </h1>
          <p className="mt-2 text-muted-foreground">{article.summary}</p>
        </div>

        <div className="prose prose-invert max-w-none text-sm leading-relaxed text-foreground/90">
          {article.body.split("\n").map((line, i) => {
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
            if (line.trim() === "") return <div key={i} className="h-2" />;
            return (
              <p key={i} className="text-foreground/80">
                {renderInlineMarkdown(line)}
              </p>
            );
          })}
        </div>

        <Disclaimer variant="compact" />
      </article>
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
