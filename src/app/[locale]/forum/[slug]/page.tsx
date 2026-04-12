import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { BackLink } from "@/components/layout/back-link";
import { EmptyState } from "@/components/layout/empty-state";
import { prisma } from "@/lib/prisma";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MessageSquarePlus } from "lucide-react";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
};

export const dynamic = "force-dynamic";

export default async function ForumCategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { q } = await searchParams;
  const query = q?.trim();

  const category = await prisma.forumCategory.findUnique({
    where: { slug },
    include: {
      threads: {
        where: query
          ? {
              title: { contains: query, mode: "insensitive" as const },
            }
          : undefined,
        orderBy: { updatedAt: "desc" },
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
      <BackLink href="/forum">Diễn đàn</BackLink>
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
          Tạo chủ đề mới
        </Link>
      </div>

      <form method="get" className="flex max-w-xl flex-wrap gap-2">
        <Input
          name="q"
          defaultValue={query ?? ""}
          placeholder="Lọc theo tiêu đề trong mục này…"
          className="min-w-[200px] flex-1"
        />
        <Button type="submit" variant="outline" size="sm">
          Lọc
        </Button>
      </form>

      {category.threads.length === 0 ? (
        <EmptyState
          icon={MessageSquarePlus}
          title="Chưa có bài viết trong mục này"
          description={
            query
              ? "Thử bỏ bộ lọc hoặc từ khóa khác."
              : "Tạo chủ đề đầu tiên để mở cuộc thảo luận."
          }
          primary={{ href: `/forum/${slug}/new`, label: "Tạo chủ đề mới" }}
          secondary={[{ href: "/forum/search", label: "Tìm toàn diễn đàn" }]}
        />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {category.threads.map((t) => (
            <li key={t.id}>
              <Link
                href={`/forum/${slug}/thread/${t.slug}`}
                className="block p-4 transition hover:bg-muted/40"
              >
                <span className="font-medium text-foreground">{t.title}</span>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>{t.author?.name ?? t.author?.email ?? "Ẩn danh"}</span>
                  <span>{new Date(t.updatedAt).toLocaleString("vi-VN")}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
