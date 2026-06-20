import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BackLink } from "@/components/layout/back-link";
import { EmptyState } from "@/components/layout/empty-state";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("forum");
  return { title: t("searchMetaTitle") };
}

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

export default async function ForumSearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("forum");

  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const results =
    query.length >= 2
      ? await prisma.forumThread.findMany({
          where: {
            title: { contains: query, mode: "insensitive" },
          },
          take: 40,
          orderBy: { updatedAt: "desc" },
          include: {
            category: { select: { slug: true, name: true } },
            author: { select: { name: true, email: true } },
          },
        })
      : [];

  return (
    <div className="space-y-6">
      <BackLink href="/forum">{t("backToForum")}</BackLink>
      <h1 className="font-heading text-2xl font-semibold text-foreground">
        {t("searchThreads")}
      </h1>
      <form method="get" className="flex flex-wrap gap-2">
        <Input
          name="q"
          defaultValue={query}
          placeholder={t("searchKeywordPlaceholder")}
          className="min-w-[240px] flex-1"
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
        <ul className="divide-y divide-border rounded-xl border border-border">
          {results.map((row) => (
            <li key={row.id}>
              <Link
                href={`/forum/${row.category.slug}/thread/${row.slug}`}
                className="block p-4 hover:bg-muted/40"
              >
                <span className="font-medium text-foreground">{row.title}</span>
                <div className="mt-1 text-xs text-muted-foreground">
                  {row.category.name} · {row.author?.name ?? row.author?.email}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
