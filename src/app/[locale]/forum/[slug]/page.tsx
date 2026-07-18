import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BackLink } from "@/components/layout/back-link";
import { EmptyState } from "@/components/layout/empty-state";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toggleThreadPin } from "@/actions/moderation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MessageSquarePlus, Pin, PinOff } from "lucide-react";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ q?: string }>;
};

export const dynamic = "force-dynamic";

export default async function ForumCategoryPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("forum");
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";

  const { q } = await searchParams;
  const query = q?.trim();

  const session = await auth();
  const viewer = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      })
    : null;
  const isMod = viewer?.role === "MOD" || viewer?.role === "ADMIN";

  const category = await prisma.forumCategory.findUnique({
    where: { slug },
    include: {
      threads: {
        where: query
          ? {
              title: { contains: query, mode: "insensitive" as const },
            }
          : undefined,
        orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
        take: 50,
        include: {
          author: { select: { name: true, email: true } },
        },
      },
    },
  });
  if (!category) notFound();

  return (
    <div className="space-y-6">
      <BackLink href="/forum">{t("backToForum")}</BackLink>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            {category.name}
          </h1>
          {category.description && (
            <p className="mt-2 text-muted-foreground">{category.description}</p>
          )}
        </div>
        <Link
          href={`/forum/${slug}/new`}
          className={cn(buttonVariants({ size: "sm" }))}
        >
          {t("createNewThread")}
        </Link>
      </div>

      <form method="get" className="flex max-w-xl flex-wrap gap-2">
        <Input
          name="q"
          defaultValue={query ?? ""}
          placeholder={t("categoryFilterPlaceholder")}
          className="min-w-[200px] flex-1"
        />
        <Button type="submit" variant="outline" size="sm">
          {t("categoryFilter")}
        </Button>
      </form>

      {category.threads.length === 0 ? (
        <EmptyState
          icon={MessageSquarePlus}
          title={t("categoryEmptyTitle")}
          description={
            query ? t("categoryEmptyFiltered") : t("categoryEmptyDefault")
          }
          primary={{
            href: `/forum/${slug}/new`,
            label: t("createNewThread"),
          }}
          secondary={[{ href: "/forum/search", label: t("searchWholeForum") }]}
        />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {category.threads.map((row) => (
            <li key={row.id} className="flex items-center">
              <Link
                href={`/forum/${slug}/thread/${row.slug}`}
                className="block min-w-0 flex-1 p-4 transition hover:bg-muted/40"
              >
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  {row.isPinned && (
                    <Pin
                      className="size-3.5 shrink-0 text-primary"
                      aria-label={t("pinnedThread")}
                    />
                  )}
                  <span className="truncate">{row.title}</span>
                </span>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>
                    {row.author?.name ?? row.author?.email ?? t("anonymousAuthor")}
                  </span>
                  <span>{new Date(row.updatedAt).toLocaleString(dateLocale)}</span>
                </div>
              </Link>
              {isMod && (
                <form action={toggleThreadPin} className="shrink-0 pr-3">
                  <input type="hidden" name="threadId" value={row.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-foreground"
                    title={row.isPinned ? t("unpinThread") : t("pinThread")}
                  >
                    {row.isPinned ? (
                      <PinOff className="size-4" />
                    ) : (
                      <Pin className="size-4" />
                    )}
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
