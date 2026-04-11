import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Diễn đàn" };

export const dynamic = "force-dynamic";

export default async function ForumPage() {
  const categories = await prisma.forumCategory.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Diễn đàn</h1>
        <p className="mt-2 text-zinc-400">
          Vào từng chủ đề để xem thread, tạo bài mới và trả lời.
        </p>
      </div>
      <ul className="grid gap-4 md:grid-cols-2">
        {categories.map((c) => (
          <li
            key={c.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5"
          >
            <Link
              href={`/forum/${c.slug}`}
              className="text-lg font-medium text-emerald-400 hover:text-emerald-300"
            >
              {c.name}
            </Link>
            {c.description && (
              <p className="mt-2 text-sm text-zinc-500">{c.description}</p>
            )}
          </li>
        ))}
      </ul>
      {categories.length === 0 && (
        <p className="text-zinc-500">
          Chưa có danh mục — chạy{" "}
          <code className="rounded bg-zinc-800 px-1 py-0.5 font-mono text-sm">
            npm run db:seed
          </code>
          .
        </p>
      )}
    </div>
  );
}
