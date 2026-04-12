import { Link } from "@/i18n/navigation";
import { BackLink } from "@/components/layout/back-link";
import { EmptyState } from "@/components/layout/empty-state";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export const metadata = { title: "Tìm trong diễn đàn" };

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function ForumSearchPage({ searchParams }: Props) {
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
      <BackLink href="/forum">Diễn đàn</BackLink>
      <h1 className="font-heading text-2xl font-semibold text-foreground">
        Tìm chủ đề
      </h1>
      <form method="get" className="flex flex-wrap gap-2">
        <Input
          name="q"
          defaultValue={query}
          placeholder="Từ khóa (tối thiểu 2 ký tự)"
          className="min-w-[240px] flex-1"
        />
        <Button type="submit" size="sm">
          Tìm
        </Button>
      </form>

      {query.length > 0 && query.length < 2 && (
        <p className="text-sm text-amber-200/90">Nhập ít nhất 2 ký tự.</p>
      )}

      {query.length >= 2 && results.length === 0 && (
        <EmptyState
          icon={Search}
          title="Không có kết quả"
          description="Thử từ khóa khác hoặc tìm trong từng danh mục."
          primary={{ href: "/forum", label: "Về diễn đàn" }}
          secondary={[{ href: "/signals", label: "Tín hiệu" }]}
        />
      )}

      {query.length >= 2 && results.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {results.map((t) => (
            <li key={t.id}>
              <Link
                href={`/forum/${t.category.slug}/thread/${t.slug}`}
                className="block p-4 hover:bg-muted/40"
              >
                <span className="font-medium text-foreground">{t.title}</span>
                <div className="mt-1 text-xs text-muted-foreground">
                  {t.category.name} · {t.author?.name ?? t.author?.email}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
