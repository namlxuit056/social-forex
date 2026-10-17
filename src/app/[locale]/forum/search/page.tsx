import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BackLink } from "@/components/layout/back-link";
import { EmptyState } from "@/components/layout/empty-state";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { absoluteUrl } from "@/lib/site-url";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("forum");
  return {
    title: t("searchMetaTitle"),
    alternates: { canonical: absoluteUrl("/forum/search", locale) },
    // Query-param search results are low-value/duplicate for search engines.
    robots: { index: false, follow: true },
  };
}

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

type SearchRow = {
  id: string;
  title: string;
  slug: string;
  categorySlug: string;
  categoryName: string;
  authorName: string | null;
  authorEmail: string | null;
};

async function ftsSearch(query: string): Promise<SearchRow[]> {
  return prisma.$queryRaw<SearchRow[]>`
    SELECT
      t.id,
      t.title,
      t.slug,
      c.slug AS "categorySlug",
      c.name AS "categoryName",
      u.name AS "authorName",
      u.email AS "authorEmail"
    FROM "ForumThread" t
    JOIN "ForumCategory" c ON c.id = t."categoryId"
    LEFT JOIN "User" u ON u.id = t."authorId"
    WHERE t.hidden = false
      AND (
        to_tsvector('simple', t.title) @@ plainto_tsquery('simple', ${query})
        OR EXISTS (
          SELECT 1 FROM "ForumPost" p
          WHERE p."threadId" = t.id
            AND p.hidden = false
            AND to_tsvector('simple', p.body) @@ plainto_tsquery('simple', ${query})
        )
      )
    ORDER BY t."updatedAt" DESC
    LIMIT 40
  `;
}

export default async function ForumSearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("forum");

  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const results = query.length >= 2 ? await ftsSearch(query) : [];

  return (
    <div className="space-y-6">
      <BackLink href="/forum">{t("backToForum")}</BackLink>
      <h1 className="font-heading text-xl font-semibold text-foreground">
        {t("searchThreads")}
      </h1>
      <form method="get" className="flex flex-wrap gap-2">
        <Input
          name="q"
          defaultValue={query}
          placeholder={t("searchKeywordPlaceholder")}
          className="min-w-60 flex-1"
        />
        <Button type="submit" size="sm">
          {t("searchAction")}
        </Button>
      </form>

      {query.length > 0 && query.length < 2 && (
        <p className="text-sm text-amber-700 dark:text-amber-200/90">{t("searchMinChars")}</p>
      )}

      {query.length >= 2 && results.length === 0 && (
        <EmptyState
          icon={Search}
          title={t("searchNoResultsTitle")}
          description={t("searchNoResultsDesc")}
          primary={{ href: "/forum", label: t("searchBackForum") }}
          secondary={[{ href: "/signals", label: t("searchGoSignals") }]}
        />
      )}

      {query.length >= 2 && results.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            {t("searchResultsCount", { count: results.length })}
          </p>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {results.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/forum/${row.categorySlug}/thread/${row.slug}`}
                  className="block p-4 hover:bg-muted/40"
                >
                  <span className="font-medium text-foreground">{row.title}</span>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {row.categoryName} · {row.authorName ?? row.authorEmail}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
