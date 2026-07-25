import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/layout/empty-state";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";
import { absoluteUrl } from "@/lib/site-url";
import { routing } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("forum");
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: absoluteUrl("/forum", locale),
      languages: {
        vi: absoluteUrl("/forum", "vi"),
        en: absoluteUrl("/forum", "en"),
        "x-default": absoluteUrl("/forum", routing.defaultLocale),
      },
    },
  };
}

export const dynamic = "force-dynamic";

export default async function ForumPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("forum");
  const tc = await getTranslations("common");

  const categories = await prisma.forumCategory.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            {t("title")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("description")}</p>
        </div>
        <Link
          href="/forum/search"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          {tc("search")}
        </Link>
      </div>
      {categories.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={t("empty")}
          description={t("emptyHint")}
          primary={{ href: "/", label: tc("home") }}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {categories.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-border bg-card/50 p-5 ring-1 ring-foreground/5"
            >
              <Link
                href={`/forum/${c.slug}`}
                className="font-heading text-lg font-medium text-primary hover:underline"
              >
                {c.name}
              </Link>
              {c.description && (
                <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
