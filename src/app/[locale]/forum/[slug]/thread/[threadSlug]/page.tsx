import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BackLink } from "@/components/layout/back-link";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { auth } from "@/auth";
import { ReplyForm } from "@/components/forum/reply-form";
import { ReportButton } from "@/components/forum/report-button";
import { HidePostButton, DeleteThreadButton } from "@/components/forum/mod-actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { pageCtaItems } from "@/lib/page-cta-i18n";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string; slug: string; threadSlug: string }>;
};

export const dynamic = "force-dynamic";

export default async function ForumThreadPage({ params }: Props) {
  const { locale, slug, threadSlug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("forum");
  const tCommon = await getTranslations("common");
  const ctaRow = await pageCtaItems("community", "trading");
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";

  const session = await auth();

  const dbUser = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      })
    : null;

  const isMod = dbUser?.role === "MOD" || dbUser?.role === "ADMIN";

  const thread = await prisma.forumThread.findFirst({
    where: {
      slug: threadSlug,
      category: { slug },
    },
    include: {
      category: true,
      author: { select: { id: true, name: true, email: true } },
      posts: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!thread) notFound();

  const visiblePosts = isMod
    ? thread.posts
    : thread.posts.filter((p) => !p.hidden);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <BackLink href={`/forum/${slug}`}>{thread.category.name}</BackLink>
        {isMod && (
          <DeleteThreadButton threadId={thread.id} categorySlug={slug} />
        )}
      </div>

      <header>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {thread.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {thread.author?.id ? (
            <Link
              href={`/u/${thread.author.id}`}
              className="font-medium text-primary hover:underline"
            >
              {thread.author?.name ?? thread.author?.email}
            </Link>
          ) : (
            (thread.author?.name ?? thread.author?.email)
          )}{" "}
          · {new Date(thread.createdAt).toLocaleString(dateLocale)}
        </p>
      </header>

      <div className="space-y-6">
        {visiblePosts.map((p) => (
          <article
            key={p.id}
            className={cn(
              "rounded-xl border border-border bg-card/50 p-5 ring-1 ring-foreground/5",
              p.hidden && "opacity-50",
            )}
          >
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>
                {p.author?.id ? (
                  <Link
                    href={`/u/${p.author.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {p.author?.name ?? p.author?.email}
                  </Link>
                ) : (
                  (p.author?.name ?? p.author?.email)
                )}{" "}
                · {new Date(p.createdAt).toLocaleString(dateLocale)}
              </span>
              {p.hidden && (
                <Badge variant="outline" className="text-[10px]">
                  {t("hidden")}
                </Badge>
              )}
            </div>
            <div className="whitespace-pre-wrap text-foreground/90">{p.body}</div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {session?.user && <ReportButton postId={p.id} />}
              {isMod && <HidePostButton postId={p.id} hidden={p.hidden} />}
            </div>
          </article>
        ))}
      </div>

      {session?.user ? (
        <div className="rounded-xl border border-border bg-muted/20 p-5">
          <ReplyForm threadId={thread.id} categorySlug={slug} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          <Link
            href="/auth/signin"
            className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto px-0")}
          >
            {t("threadLoginWord")}
          </Link>
          {t("threadLoginSuffix")}
        </p>
      )}

      <PageCtaRow heading={tCommon("next")} items={ctaRow} />
    </div>
  );
}
