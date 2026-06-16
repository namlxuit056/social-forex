import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Disclaimer } from "@/components/layout/disclaimer";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("articles");
  return { title: t("title"), description: t("description") };
}

function formatDate(value: Date | null, locale: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(value);
}

export default async function ArticlesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("articles");

  const articles = await prisma.aiGeneratedArticle.findMany({
    where: { locale, status: "PUBLISHED" },
    orderBy: [{ publishedAt: "desc" }, { generatedAt: "desc" }],
    take: 30,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          {t("description")}
        </p>
      </div>

      {articles.length === 0 ? (
        <section className="rounded-lg border border-dashed border-border/70 p-6 text-sm text-muted-foreground">
          {t("empty")}
        </section>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {articles.map((article) => (
            <li
              key={article.id}
              className="rounded-xl border border-border bg-card/50 p-5 ring-1 ring-foreground/5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{article.keyword}</Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDate(article.publishedAt ?? article.generatedAt, locale)}
                </span>
              </div>
              <h2 className="mt-3 font-heading text-lg font-medium text-foreground">
                {article.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {article.summary}
              </p>
              <Link
                href={`/articles/${article.slug}`}
                className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
              >
                {t("readMore")}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Disclaimer variant="compact" />
    </div>
  );
}
