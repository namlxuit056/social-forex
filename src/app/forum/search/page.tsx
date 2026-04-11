import Link from "next/link";
import { prisma } from "@/lib/prisma";

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
      <Link href="/forum" className="text-sm text-emerald-500 hover:underline">
        ← Diễn đàn
      </Link>
      <h1 className="text-2xl font-semibold text-white">Tìm chủ đề</h1>
      <form method="get" className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Từ khóa (tối thiểu 2 ký tự)"
          className="min-w-[240px] flex-1 rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
        />
        <button
          type="submit"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500"
        >
          Tìm
        </button>
      </form>

      {query.length > 0 && query.length < 2 && (
        <p className="text-sm text-amber-200/90">Nhập ít nhất 2 ký tự.</p>
      )}

      {query.length >= 2 && (
        <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800">
          {results.length === 0 && (
            <li className="p-6 text-zinc-500">Không có kết quả.</li>
          )}
          {results.map((t) => (
            <li key={t.id}>
              <Link
                href={`/forum/${t.category.slug}/thread/${t.slug}`}
                className="block p-4 hover:bg-zinc-900/50"
              >
                <span className="font-medium text-zinc-100">{t.title}</span>
                <div className="mt-1 text-xs text-zinc-500">
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
