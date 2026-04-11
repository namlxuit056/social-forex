import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

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
      <Link href="/forum" className="text-sm text-emerald-500 hover:underline">
        ← Diễn đàn
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">{category.name}</h1>
          {category.description && (
            <p className="mt-2 text-zinc-400">{category.description}</p>
          )}
        </div>
        <Link
          href={`/forum/${slug}/new`}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          Tạo chủ đề mới
        </Link>
      </div>

      <form method="get" className="flex max-w-xl flex-wrap gap-2">
        <input
          name="q"
          defaultValue={query ?? ""}
          placeholder="Lọc theo tiêu đề trong mục này…"
          className="min-w-[200px] flex-1 rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded border border-zinc-600 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          Lọc
        </button>
      </form>

      <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800">
        {category.threads.length === 0 && (
          <li className="p-6 text-zinc-500">Chưa có bài viết.</li>
        )}
        {category.threads.map((t) => (
          <li key={t.id}>
            <Link
              href={`/forum/${slug}/thread/${t.slug}`}
              className="block p-4 transition hover:bg-zinc-900/50"
            >
              <span className="font-medium text-zinc-100">{t.title}</span>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-500">
                <span>
                  {t.author?.name ?? t.author?.email ?? "Ẩn danh"}
                </span>
                <span>
                  {new Date(t.updatedAt).toLocaleString("vi-VN")}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
