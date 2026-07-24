import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { marked } from "marked";
import { Disclaimer } from "@/components/layout/disclaimer";
import { ArticleChat } from "@/components/ai/article-chat";
import { Badge } from "@/components/ui/badge";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { routing } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/site-url";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-json-ld";
import { BreadcrumbNav } from "@/components/seo/breadcrumb-nav";
import { RelatedArticles, RelatedLessons } from "@/components/seo/related-content";
import { findRelatedArticles } from "@/lib/related-articles";
import { getRelatedAcademyLessonsByKeywords } from "@/lib/content/academy";
import { auth } from "@/auth";
import { isVipActive } from "@/lib/vip";

function ensureHtml(body: string): string {
  const trimmed = body.trimStart();
  // Already HTML if starts with a tag
  if (trimmed.startsWith("<")) return body;
  // Looks like markdown — convert
  const html = marked.parse(trimmed, { async: false }) as string;
  return html;
}

type Props = { params: Promise<{ locale: string; slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const article = await prisma.aiGeneratedArticle.findUnique({
    where: { locale_slug: { locale, slug } },
  });
  if (!article || article.status !== "PUBLISHED") return {};

  const canonicalUrl = absoluteUrl(`/articles/${slug}`, locale);

  // Look up the alternate-locale version for hreflang
  const alternateLocale = locale === "vi" ? "en" : "vi";
  const alternateArticle = await prisma.aiGeneratedArticle.findUnique({
    where: { locale_slug: { locale: alternateLocale, slug } },
    select: { slug: true },
  });

  const languages: Record<string, string> = {
    vi: absoluteUrl(`/articles/${slug}`, "vi"),
    en: absoluteUrl(`/articles/${slug}`, "en"),
    "x-default": absoluteUrl(`/articles/${slug}`, routing.defaultLocale),
  };
  if (!alternateArticle) {
    delete languages[alternateLocale];
  }

  return {
    title: article.title,
    description: article.metaDescription,
    keywords: article.sourceKeywords,
    alternates: { canonical: canonicalUrl, languages },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.metaDescription,
      url: absoluteUrl(`/articles/${slug}`, locale),
      siteName: "Social Forex",
      section: "AI Articles",
      tags: article.sourceKeywords,
      publishedTime: article.publishedAt?.toISOString(),
      ...(article.imageUrl && {
        images: [{ url: article.imageUrl, width: 1200, height: 630, alt: article.imageAlt ?? article.keyword }],
      }),
    },
    twitter: {
      card: article.imageUrl ? "summary_large_image" : "summary",
      title: article.title,
      description: article.metaDescription,
      ...(article.imageUrl && { images: [article.imageUrl] }),
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
  const tCommon = await getTranslations("common");

  const article = await prisma.aiGeneratedArticle.findUnique({
    where: { locale_slug: { locale, slug } },
  });

  // Fallback: article exists but was saved with a different locale (e.g. en slug accessed via /vi/)
  if (!article || article.status !== "PUBLISHED") {
    const fallback = await prisma.aiGeneratedArticle.findFirst({
      where: { slug, status: "PUBLISHED" },
    });
    if (!fallback) notFound();
    // Redirect to the correct locale-prefixed URL
    const prefix = fallback.locale === routing.defaultLocale ? "" : `/${fallback.locale}`;
    redirect(`${prefix}/articles/${slug}`);
  }

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
    ...(article.imageUrl && {
      image: { "@type": "ImageObject", url: article.imageUrl, width: 1200, height: 630 },
    }),
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

  // Fetch related content for internal linking
  const keywordsForRelated = [article.keyword, ...article.sourceKeywords];
  const [relatedArticles, relatedLessons, session] = await Promise.all([
    findRelatedArticles({
      keywords: keywordsForRelated,
      locale,
      excludeSlug: slug,
      limit: 3,
    }),
    getRelatedAcademyLessonsByKeywords(keywordsForRelated, locale, 3),
    auth(),
  ]);
  const userId = session?.user?.id;
  const chatUser = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { vipUntil: true },
      })
    : null;
  const isLoggedIn = !!userId;
  const isVip = isVipActive(chatUser?.vipUntil);

  return (
    <div className="space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Social Forex", path: "/" },
          { name: t("backToList").replace("← ", ""), path: "/articles" },
          { name: article.title, path: `/articles/${slug}` },
        ]}
        locale={locale}
      />
      <PageViewTracker
        eventName={ANALYTICS_EVENTS.articleRead}
        properties={{ keyword: article.keyword, locale, slug }}
      />
      <BreadcrumbNav
        items={[
          { label: tCommon("home"), href: "/" },
          { label: t("backToList"), href: "/articles" },
          { label: article.title },
        ]}
      />
      <div className="lg:grid lg:grid-cols-[minmax(0,42rem)_20rem] lg:items-start lg:gap-8">
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

          {article.imageUrl && (
            <div className="overflow-hidden rounded-xl border border-border/60">
              <Image
                src={article.imageUrl}
                alt={article.imageAlt ?? article.keyword}
                width={1200}
                height={630}
                className="w-full object-cover"
                priority
              />
            </div>
          )}

          <div
            className="article-body prose prose-invert max-w-none text-sm leading-relaxed text-foreground/90"
            // Body is authored by admin/AI only — trusted HTML source
            dangerouslySetInnerHTML={{ __html: ensureHtml(article.body) }}
          />

          <Disclaimer variant="compact" />
        </article>

        <aside className="mt-8 lg:sticky lg:top-4 lg:mt-0">
          <ArticleChat articleId={article.id} isLoggedIn={isLoggedIn} isVip={isVip} />
        </aside>
      </div>

      <div className="max-w-2xl space-y-8">
        <RelatedArticles articles={relatedArticles} label={t("relatedArticles")} />
        <RelatedLessons lessons={relatedLessons} label={t("relatedLessons")} />
      </div>
    </div>
  );
}

